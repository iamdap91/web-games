"""승인된 Meshy 겉옷을 기존 아타호 본체 좌표와 뼈대에 맞추는 리소스 변환 도구."""

import argparse
import json
from collections import defaultdict
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def parse_arguments():
    import sys

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--variant', choices=['original', 'concept'], default='concept')
    arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return parser.parse_args(arguments)


def smooth_step(start, end, value):
    amount = max(0.0, min(1.0, (value - start) / (end - start)))
    return amount * amount * (3.0 - 2.0 * amount)


def map_height(height):
    # 원본의 목깃 높이와 헴을 보존하며 낮게 생성된 소매를 본체 팔 위치로 올린다.
    anchors = [(-0.472, 0.68), (0.0, 1.13), (0.25, 1.315), (0.471, 1.40)]
    for (start, target_start), (end, target_end) in zip(anchors, anchors[1:]):
        if height <= end:
            return target_start + (height - start) / (end - start) * (target_end - target_start)
    return anchors[-1][1]


def import_meshes(asset_path):
    previous = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(asset_path))
    return set(bpy.data.objects) - previous


def world_bounds(mesh_object):
    points = [mesh_object.matrix_world @ vertex.co for vertex in mesh_object.data.vertices]
    return [[min(point[axis] for point in points), max(point[axis] for point in points)] for axis in range(3)]


def create_body_tree(body):
    points = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
    triangles = [list(polygon.vertices) for polygon in body.data.polygons]
    return points, triangles, BVHTree.FromPolygons(points, triangles, all_triangles=True)


def clear_sleeve_caps(jacket, body_tree):
    # 소매 끝에서 안쪽 약 10cm에 생성된 막힌 면만 제거한다. 외부 커프 테두리는 유지한다.
    jacket.data.update()
    mesh = bmesh.new()
    mesh.from_mesh(jacket.data)
    caps = []
    for face in mesh.faces:
        center = face.calc_center_median()
        nearest, normal, _, _ = body_tree.find_nearest(center)
        inside_arm = (center - nearest).dot(normal) < -0.003
        if 0.45 < abs(center.x) < 0.61 and abs(face.normal.x) > 0.65 and inside_arm:
            caps.append(face)
    removed = len(caps)
    bmesh.ops.delete(mesh, geom=caps, context='FACES')
    unused = [vertex for vertex in mesh.verts if not vertex.link_faces]
    bmesh.ops.delete(mesh, geom=unused, context='VERTS')
    mesh.to_mesh(jacket.data)
    mesh.free()
    jacket.data.update()
    return removed


def clear_body_intersections(jacket, body_tree, concept=False):
    pushed = 0
    maximum_push = 0.0
    for vertex in jacket.data.vertices:
        if vertex.co.z > (1.36 if concept else 1.20) and abs(vertex.co.x) < 0.19:
            continue
        point, normal, _, _ = body_tree.find_nearest(vertex.co)
        signed_distance = (vertex.co - point).dot(normal)
        if signed_distance < 0.012:
            target = point + normal * 0.012
            if concept and vertex.co.z > 1.20 and abs(vertex.co.x) < 0.23:
                shift = target - vertex.co
                if shift.length > 0.035:
                    target = vertex.co + shift.normalized() * 0.035
            maximum_push = max(maximum_push, (target - vertex.co).length)
            vertex.co = target
            pushed += 1
    jacket.data.update()
    return {'verticesAdjusted': pushed, 'clearanceMeters': 0.012, 'maximumAdjustmentMeters': maximum_push}


def barycentric(point, a, b, c):
    edge_a, edge_b, delta = b - a, c - a, point - a
    aa, ab, bb = edge_a.dot(edge_a), edge_a.dot(edge_b), edge_b.dot(edge_b)
    denominator = aa * bb - ab * ab
    if abs(denominator) < 1e-18:
        return (1.0, 0.0, 0.0)
    second = (bb * delta.dot(edge_a) - ab * delta.dot(edge_b)) / denominator
    third = (aa * delta.dot(edge_b) - ab * delta.dot(edge_a)) / denominator
    values = [max(0.0, 1.0 - second - third), max(0.0, second), max(0.0, third)]
    total = sum(values)
    return [value / total for value in values]


def transfer_weights(jacket, body, body_points, body_triangles, body_tree, rig, concept=False):
    source_names = {group.index: group.name for group in body.vertex_groups}
    source = [{source_names[group.group]: group.weight for group in vertex.groups} for vertex in body.data.vertices]
    torso = {'Hips', 'Spine02', 'Spine01', 'Spine', 'neck'}
    values = []
    for vertex in jacket.data.vertices:
        point, _, face_index, _ = body_tree.find_nearest(vertex.co)
        indices = body_triangles[face_index]
        factors = barycentric(point, *(body_points[index] for index in indices))
        allowed = set(torso)
        if abs(vertex.co.x) > 0.20:
            prefix = 'Left' if vertex.co.x > 0.0 else 'Right'
            allowed.update(prefix + suffix for suffix in ('Shoulder', 'Arm', 'ForeArm', 'Hand'))
        weights = defaultdict(float)
        for index, factor in zip(indices, factors):
            for name, weight in source[index].items():
                if name in allowed:
                    weights[name] += factor * weight
        if sum(weights.values()) <= 1e-12:
            weights.clear()
            weights['Spine'] = 1.0
        if concept:
            # 짧은 반소매가 전완과 함께 접히며 구형이 되지 않도록 소매는 상완을 주로 따른다.
            sleeve = smooth_step(0.24, 0.34, abs(vertex.co.x)) * smooth_step(1.00, 1.09, vertex.co.z)
            shoulder = smooth_step(0.18, 0.29, abs(vertex.co.x)) * smooth_step(1.16, 1.30, vertex.co.z)
            sleeve = max(sleeve, shoulder)
            if sleeve > 0.0:
                prefix = 'Left' if vertex.co.x > 0.0 else 'Right'
                forearm = 0.10 * smooth_step(0.46, 0.52, abs(vertex.co.x))
                for name in list(weights):
                    weights[name] *= 1.0 - sleeve
                weights[prefix + 'Arm'] += sleeve * (1.0 - forearm)
                weights[prefix + 'ForeArm'] += sleeve * forearm
        total = sum(weights.values())
        values.append({name: weight / total for name, weight in weights.items()})

    adjacency = [set() for _ in jacket.data.vertices]
    for edge in jacket.data.edges:
        first, second = edge.vertices
        adjacency[first].add(second)
        adjacency[second].add(first)
    # 옷의 넓은 면에서 최근접 삼각형이 바뀌는 경계의 웨이트만 완만하게 잇는다.
    for _ in range(2):
        smoothed = []
        for index, neighbors in enumerate(adjacency):
            weights = defaultdict(float, {name: value * 0.65 for name, value in values[index].items()})
            if neighbors:
                for neighbor in neighbors:
                    for name, value in values[neighbor].items():
                        weights[name] += value * 0.35 / len(neighbors)
            else:
                weights = values[index]
            smoothed.append(dict(weights))
        values = smoothed

    # UV/노멀 경계에서 분리된 같은 위치의 정점도 같은 웨이트를 써야 동작 중 틈이 생기지 않는다.
    seam_groups = defaultdict(list)
    for vertex in jacket.data.vertices:
        seam_groups[tuple(round(component * 100000.0) for component in vertex.co)].append(vertex.index)
    for indices in seam_groups.values():
        if len(indices) < 2:
            continue
        shared = defaultdict(float)
        for index in indices:
            for name, weight in values[index].items():
                shared[name] += weight / len(indices)
        for index in indices:
            values[index] = dict(shared)

    for bone in rig.data.bones:
        jacket.vertex_groups.new(name=bone.name)
    for index, weights in enumerate(values):
        largest = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:4]
        total = sum(weight for _, weight in largest)
        for name, weight in largest:
            jacket.vertex_groups[name].add([index], weight / total, 'REPLACE')
    modifier = jacket.modifiers.new('ExistingBodyRig', 'ARMATURE')
    modifier.object = rig
    jacket.parent = rig
    jacket.matrix_parent_inverse = rig.matrix_world.inverted()
    jacket.matrix_world = Matrix.Identity(4)
    sums = [sum(group.weight for group in vertex.groups) for vertex in jacket.data.vertices]
    return {
        'method': 'nearest body triangle barycentric weights; anatomical side filtering; two adjacency smoothing passes',
        'boneCount': len(rig.data.bones),
        'sharedPositionGroupsStitched': sum(len(indices) > 1 for indices in seam_groups.values()),
        'usedBones': sorted({jacket.vertex_groups[group.group].name for vertex in jacket.data.vertices for group in vertex.groups}),
        'maximumInfluences': max(len(vertex.groups) for vertex in jacket.data.vertices),
        'weightSumRange': [min(sums), max(sums)],
        'unweightedVertices': sum(not vertex.groups for vertex in jacket.data.vertices),
    }


def reshape_for_concept(jacket):
    adjusted = 0
    for vertex in jacket.data.vertices:
        point = vertex.co.copy()
        lateral = abs(point.x)
        sleeve = smooth_step(0.26, 0.36, lateral) * smooth_step(0.98, 1.09, point.z)
        if sleeve:
            target_x = lateral - max(0.0, lateral - 0.27) * 0.40
            target_z_center = 1.23 - min(0.15, max(0.0, target_x - 0.27)) / 3.0
            target_y_center = 0.01 + min(0.02, max(0.0, target_x - 0.27) * 0.12)
            target = Vector((target_x if point.x > 0.0 else -target_x,
                             (point.y - 0.02) * 0.78 + target_y_center,
                             (point.z - 1.205) * 0.84 + target_z_center))
            point = point.lerp(target, sleeve)
        # 높은 목깃을 턱 아래로 눕히고 앞판 아랫단을 허리띠 위로 정리한다.
        collar = (1.0 - smooth_step(0.18, 0.29, abs(point.x))) * smooth_step(1.20, 1.40, point.z)
        point.z -= 0.06 * collar
        point.x += (0.020 if point.x > 0.0 else -0.020) * collar
        shoulder = smooth_step(0.16, 0.25, abs(point.x)) * (1.0 - smooth_step(0.34, 0.44, abs(point.x))) * smooth_step(1.20, 1.35, point.z)
        point.z -= 0.025 * shoulder
        point.y *= 1.0 - 0.15 * collar
        front = smooth_step(0.08, 0.24, -point.y) * (1.0 - smooth_step(0.25, 0.34, abs(point.x)))
        hem = 1.0 - smooth_step(0.78, 0.94, point.z)
        point.z += 0.10 * front * hem
        opening = front * (1.0 - smooth_step(0.90, 1.15, point.z))
        point.x += (0.045 if point.x > 0.0 else -0.045) * opening
        if (point - vertex.co).length > 1e-8:
            adjusted += 1
        vertex.co = point
    jacket.data.update()
    return {'verticesAdjusted': adjusted, 'sleeveLengthFactorBeyondX027': 0.60,
            'sleeveYWidthFactor': 0.78, 'sleeveZWidthFactor': 0.84,
            'collarMaximumLoweringMeters': 0.06, 'shoulderDropMaximumMeters': 0.025, 'frontHemMaximumRaiseMeters': 0.10,
            'frontOpeningMaximumWidenEachSideMeters': 0.045}


def shape_concept_back(jacket, body_tree):
    depth_changes = []
    shoulder_changes = []
    ray_misses = 0

    # 개별 ray의 누락과 꼬리 경계에서 뒤판이 꺾이지 않게 부드러운 깊이장을 보간한다.
    x_min, z_min, step = -0.40, 0.75, 0.025
    x_count, z_count = 33, 25
    field = []
    valid = []
    for row in range(z_count):
        values = []
        z = z_min + row * step
        for column in range(x_count):
            x = x_min + column * step
            point = body_tree.ray_cast(Vector((x, 0.80, min(z, 1.29))), Vector((0, -1, 0)), 1.60)[0]
            value = point.y if point is not None else None
            tail = (1.0 - smooth_step(0.06, 0.17, abs(x))) * (1.0 - smooth_step(0.82, 0.95, z))
            if tail:
                samples = [body_tree.ray_cast(Vector((side * 0.15, 0.80, z)), Vector((0, -1, 0)), 1.60)[0] for side in (-1, 1)]
                hits = [hit.y for hit in samples if hit is not None]
                if hits:
                    side_y = sum(hits) / len(hits)
                    value = side_y if value is None else value * (1.0 - tail) + side_y * tail
            if value is not None:
                value = max(0.06, value)
                valid.append((row, column, value))
            values.append(value)
        field.append(values)
    for row in range(z_count):
        for column in range(x_count):
            if field[row][column] is None:
                closest = min(valid, key=lambda item: (item[0] - row) ** 2 + (item[1] - column) ** 2)
                field[row][column] = closest[2]
    for _ in range(3):
        smoothed = []
        for row in range(z_count):
            values = []
            for column in range(x_count):
                neighbors = [field[r][c] for r, c in [(row - 1, column), (row + 1, column), (row, column - 1), (row, column + 1)] if 0 <= r < z_count and 0 <= c < x_count]
                values.append(field[row][column] * 0.5 + sum(neighbors) / len(neighbors) * 0.5)
            smoothed.append(values)
        field = smoothed

    def body_back_y(x, z):
        grid_x = min(x_count - 1.000001, max(0.0, (x - x_min) / step))
        grid_z = min(z_count - 1.000001, max(0.0, (z - z_min) / step))
        column, row = int(grid_x), int(grid_z)
        fx, fz = grid_x - column, grid_z - row
        bottom = field[row][column] * (1.0 - fx) + field[row][column + 1] * fx
        top = field[row + 1][column] * (1.0 - fx) + field[row + 1][column + 1] * fx
        return bottom * (1.0 - fz) + top * fz

    for vertex in jacket.data.vertices:
        point = vertex.co
        torso = ((1.0 - smooth_step(0.26, 0.34, abs(point.x)))
                 * smooth_step(0.76, 0.86, point.z)
                 * (1.0 - smooth_step(1.23, 1.31, point.z)))
        shoulder = (smooth_step(0.18, 0.25, abs(point.x))
                    * (1.0 - smooth_step(0.34, 0.40, abs(point.x)))
                    * smooth_step(1.18, 1.29, point.z))
        back = smooth_step(0.00, 0.12, point.y)
        influence = max(torso, shoulder) * back
        if influence <= 1e-8:
            continue
        surface_y = body_back_y(point.x, point.z)
        if surface_y is None:
            ray_misses += 1
        else:
            target = surface_y + 0.02
            if point.y > target:
                desired = target + (point.y - target) * 0.25
                tail_keep = (1.0 - smooth_step(0.09, 0.18, abs(point.x))) * (1.0 - smooth_step(0.84, 0.93, point.z))
                change = (point.y - desired) * influence * (1.0 - tail_keep)
                point.y -= change
                if change > 1e-8:
                    depth_changes.append(change)
        # 몸체 어깨의 가려지는 면은 통합 단계에서 삭제한다. 그 면을 피하려고 다시 옷을 키우지 않는다.
        drop = 0.035 * shoulder * smooth_step(0.06, 0.16, point.y)
        if drop > 1e-8:
            point.z -= drop
            shoulder_changes.append(drop)
    jacket.data.update()
    return {
        'backDepthAdjustedVertices': len(depth_changes),
        'backDepthMaximumReductionMeters': max(depth_changes, default=0.0),
        'backDepthMeanReductionMeters': sum(depth_changes) / max(1, len(depth_changes)),
        'targetBodyBackClearanceMeters': 0.02,
        'remainingExcessDepthFraction': 0.25,
        'tailExitProtection': 'Keep original rear depth only around absX0..0.18 and Zbelow0.93, smoothly fading; no new tail obstruction or global enlargement.',
        'shoulderAdjustedVertices': len(shoulder_changes),
        'shoulderMaximumDropMeters': max(shoulder_changes, default=0.0),
        'rayMisses': ray_misses,
        'bodyBackField': {'gridStepMeters': step, 'columns': x_count, 'rows': z_count, 'smoothingPasses': 3},
        'weightsPreservedFromPriorConcept': True,
        'integrationRequirement': 'Mask covered body shoulder faces up to Z1.36 while preserving head and neck weighted faces; do not enlarge the jacket to avoid hidden body patches.',
    }


def shape_concept_front(jacket, body_tree):
    x_min, z_min, step = -0.40, 0.75, 0.025
    x_count, z_count = 33, 25
    field = []
    valid = []
    for row in range(z_count):
        values = []
        z = z_min + row * step
        for column in range(x_count):
            x = x_min + column * step
            point = body_tree.ray_cast(Vector((x, -0.80, z)), Vector((0, 1, 0)), 1.60)[0]
            value = min(-0.06, point.y) if point is not None else None
            if value is not None:
                valid.append((row, column, value))
            values.append(value)
        field.append(values)
    for row in range(z_count):
        for column in range(x_count):
            if field[row][column] is None:
                closest = min(valid, key=lambda item: (item[0] - row) ** 2 + (item[1] - column) ** 2)
                field[row][column] = closest[2]
    for _ in range(3):
        smoothed = []
        for row in range(z_count):
            values = []
            for column in range(x_count):
                neighbors = [field[r][c] for r, c in [(row - 1, column), (row + 1, column), (row, column - 1), (row, column + 1)] if 0 <= r < z_count and 0 <= c < x_count]
                values.append(field[row][column] * 0.5 + sum(neighbors) / len(neighbors) * 0.5)
            smoothed.append(values)
        field = smoothed

    def front_y(x, z):
        gx = min(x_count - 1.000001, max(0.0, (x - x_min) / step))
        gz = min(z_count - 1.000001, max(0.0, (z - z_min) / step))
        column, row = int(gx), int(gz)
        fx, fz = gx - column, gz - row
        lower = field[row][column] * (1.0 - fx) + field[row][column + 1] * fx
        upper = field[row + 1][column] * (1.0 - fx) + field[row + 1][column + 1] * fx
        return lower * (1.0 - fz) + upper * fz

    changes = []
    clearances = []
    prevented_clips = 0
    preexisting_inside = 0
    for vertex in jacket.data.vertices:
        point = vertex.co
        influence = (smooth_step(0.02, 0.12, -point.y)
                     * (1.0 - smooth_step(0.25, 0.34, abs(point.x)))
                     * smooth_step(0.77, 0.86, point.z)
                     * (1.0 - smooth_step(1.27, 1.35, point.z)))
        if influence <= 1e-8:
            continue
        target = front_y(point.x, point.z) - 0.022
        if point.y >= target:
            continue
        desired = target + (point.y - target) * 0.25
        next_y = point.y + (desired - point.y) * influence
        actual = body_tree.ray_cast(Vector((point.x, -0.80, point.z)), Vector((0, 1, 0)), 1.60)[0]
        if actual is not None:
            if next_y > actual.y - 0.012:
                next_y = max(point.y, actual.y - 0.012)
                prevented_clips += 1
            if point.y > actual.y - 0.012:
                preexisting_inside += 1
            else:
                clearances.append(actual.y - next_y)
        change = next_y - point.y
        if change > 1e-8:
            changes.append(change)
            point.y = next_y
    jacket.data.update()
    return {
        'frontDepthAdjustedVertices': len(changes),
        'maximumDepthReductionMeters': max(changes, default=0.0),
        'meanDepthReductionMeters': sum(changes) / max(1, len(changes)),
        'targetBodyFrontClearanceMeters': 0.022,
        'remainingExcessDepthFraction': 0.25,
        'rawRayMinimumClearanceMeters': min(clearances, default=None),
        'rawRayClippingPreventedVertices': prevented_clips,
        'preexistingInsideBodySamplesNotEnlarged': preexisting_inside,
        'bodyFrontField': {'gridStepMeters': step, 'columns': x_count, 'rows': z_count, 'smoothingPasses': 3},
        'xAndZPreserved': True, 'uvAndWeightsPreserved': True,
    }


def render_concept_pose(output, scene, rig):
    saved = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    for prefix, side in [('Left', 1), ('Right', -1)]:
        arm, forearm = rig.pose.bones[prefix + 'Arm'], rig.pose.bones[prefix + 'ForeArm']
        start = arm.matrix.translation.copy()
        direction = forearm.matrix.translation - start
        rotation = direction.rotation_difference(Vector((side * 0.30, -0.035, -0.953))).to_matrix().to_4x4()
        arm.matrix = Matrix.Translation(start) @ rotation @ Matrix.Translation(-start) @ arm.matrix
        bpy.context.view_layer.update()
        hand = rig.pose.bones[prefix + 'Hand']
        start = forearm.matrix.translation.copy()
        direction = hand.matrix.translation - start
        rotation = direction.rotation_difference(Vector((side * 0.10, -0.10, -0.99))).to_matrix().to_4x4()
        forearm.matrix = Matrix.Translation(start) @ rotation @ Matrix.Translation(-start) @ forearm.matrix
        bpy.context.view_layer.update()
    for name, location in [('front', (0, -4, 1.10)), ('three-quarter', (2, -4, 1.15)), ('back-three-quarter', (2, 4, 1.15))]:
        scene.camera.location = location
        scene.camera.rotation_euler = (Vector((0, 0, 0.83)) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / f'jacket-concept-arms-down-{name}.png')
        bpy.ops.render.render(write_still=True)
    for name, matrix in saved.items():
        rig.pose.bones[name].matrix_basis = matrix
    bpy.context.view_layer.update()


def aperture_diagnostics(jacket):
    tree = BVHTree.FromPolygons([vertex.co.copy() for vertex in jacket.data.vertices], [list(face.vertices) for face in jacket.data.polygons], all_triangles=True)
    rays = {
        'neck': ((0, 0, 1.60), (0, 0, -1)),
        'leftSleeveCenter': ((0.80, 0.02, 1.19), (-1, 0, 0)),
        'rightSleeveCenter': ((-0.80, 0.02, 1.19), (1, 0, 0)),
        'leftSleeveLower': ((0.80, 0.02, 1.14), (-1, 0, 0)),
        'rightSleeveLower': ((-0.80, 0.02, 1.14), (1, 0, 0)),
    }
    result = {}
    for name, (origin, direction) in rays.items():
        point, _, _, distance = tree.ray_cast(Vector(origin), Vector(direction), 1.8)
        result[name] = {'origin': origin, 'direction': direction, 'firstHit': list(point) if point else None, 'distanceMeters': distance}
    return result


def render_review(output, scene):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.render.resolution_x = 800
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('ReviewWorld')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value = (0.18, 0.20, 0.24, 1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.8
    for index, (location, energy, size) in enumerate([((-2, -3, 4), 450, 3), ((2, -1, 2), 250, 2), ((0, 3, 3), 400, 3)]):
        light_data = bpy.data.lights.new(f'ReviewSoftbox{index}', 'AREA')
        light_data.energy, light_data.size = energy, size
        light = bpy.data.objects.new(light_data.name, light_data)
        scene.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0, 0, 0.9)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data = bpy.data.cameras.new('ReviewCamera')
    camera = bpy.data.objects.new('ReviewCamera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.15
    for name, location in [('front', (0, -4, 1.1)), ('side', (4, -0.2, 1.1)), ('back', (0, 4, 1.1))]:
        camera.location = location
        camera.rotation_euler = (Vector((0, 0, 0.83)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / f'jacket-fit-{name}.png')
        bpy.ops.render.render(write_still=True)


def main():
    args = parse_arguments()
    assets = args.root / 'public/assets/maplestory'
    output = assets / 'ataho-meshy-outfit/20261016/fitted/parts' / ('jacket-concept' if args.variant == 'concept' else 'jacket')
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    body_objects = import_meshes(assets / 'ataho-meshy-body/20261016/rigging/ataho-body-rigged.glb')
    body = next(obj for obj in body_objects if obj.type == 'MESH' and len(obj.data.vertices) > 1000)
    rig = next(obj for obj in body_objects if obj.type == 'ARMATURE')
    body.name, rig.name = 'ReferenceBody', 'ReferenceRig'
    rig.animation_data_clear()
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    # glTF importer가 생성한 관절 표시용 메시를 산출물에 넣지 않는다.
    for obj in body_objects - {body, rig}:
        bpy.data.objects.remove(obj, do_unlink=True)
    imported = import_meshes(assets / 'ataho-meshy-outfit/20261016/models/ataho-jacket.glb')
    jacket = next(obj for obj in imported if obj.type == 'MESH')
    jacket.name = 'Jacket'
    original_counts = {'vertices': len(jacket.data.vertices), 'triangles': len(jacket.data.polygons)}
    for vertex in jacket.data.vertices:
        source = vertex.co.copy()
        sleeve = smooth_step(0.36, 0.72, abs(source.x))
        vertex.co = (source.x * 0.68, source.y * 0.90 + 0.14 * sleeve, map_height(source.z))
    jacket.data.update()
    body_points, body_triangles, body_tree = create_body_tree(body)
    removed_faces = clear_sleeve_caps(jacket, body_tree)
    concept_shape = reshape_for_concept(jacket) if args.variant == 'concept' else None
    clearance = clear_body_intersections(jacket, body_tree, concept=args.variant == 'concept')
    weights = transfer_weights(jacket, body, body_points, body_triangles, body_tree, rig, concept=args.variant == 'concept')
    concept_back = shape_concept_back(jacket, body_tree) if args.variant == 'concept' else None
    concept_front = shape_concept_front(jacket, body_tree) if args.variant == 'concept' else None
    bpy.context.view_layer.update()
    diagnostics = {
        'sourceBody': 'public/assets/maplestory/ataho-meshy-body/20261016/rigging/ataho-body-rigged.glb',
        'sourceJacket': 'public/assets/maplestory/ataho-meshy-outfit/20261016/models/ataho-jacket.glb',
        'coordinates': 'Blender Z-up, original body import world coordinates; Jacket world matrix identity',
        'originalCounts': original_counts,
        'fittedCounts': {'vertices': len(jacket.data.vertices), 'triangles': len(jacket.data.polygons)},
        'transform': {'xScale': 0.68, 'yScale': 0.90, 'sleeveYShiftMeters': 0.14, 'heightAnchors': [[-0.472, 0.68], [0.0, 1.13], [0.25, 1.315], [0.471, 1.40]]},
        'originalTextureAndUvsPreserved': True,
        'sleeveCapFacesRemoved': removed_faces,
        'bodyClearance': clearance,
        'variant': args.variant,
        'conceptShape': concept_shape,
        'conceptBackShape': concept_back,
        'conceptFrontShape': concept_front,
        'sleeveWeightControl': 'UpperArm dominant, ForeArm maximum 10 percent near cuff' if args.variant == 'concept' else 'nearest body transfer',
        'bounds': world_bounds(jacket),
        'apertureRays': aperture_diagnostics(jacket),
        'weights': weights,
        'limitations': [
            'Ray checks sample the neck center and two sleeve center heights, not every possible passage direction.',
            'Rest-pose body clearance is geometric; final combined walk/run clipping requires actual playback review.',
            'Loose cloth has skin deformation only; no cloth simulation or new bones were introduced.',
            'The exposed wrist/hand/neck must remain visible if covered body faces are masked during integration.',
        ],
    }
    render_review(output, bpy.context.scene)
    if args.variant == 'concept':
        render_concept_pose(output, bpy.context.scene, rig)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'fit-jacket.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    jacket.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = jacket
    bpy.ops.export_scene.gltf(filepath=str(output / 'ataho-jacket-fitted.glb'), export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_yup=True)
    (output / 'diagnostics.json').write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2) + '\n')
    print('JACKET_DIAGNOSTICS', json.dumps(diagnostics))


if __name__ == '__main__':
    main()
