"""컨셉의 접힌 천 허리띠를 기존 본체 좌표와 Hips 뼈대에 맞춰 만든다.

부모 통합: runpy.run_path(path)['build_sash'](body, pants, rig)
단독 미리보기: Blender --background --factory-startup --python 이파일
"""

import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[2]
COLOR_ATTRIBUTE = 'SashClothColor'


def world_bvh(obj):
    positions = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return BVHTree.FromPolygons(positions, [list(face.vertices) for face in obj.data.polygons])


def torso_spine_weight(z):
    return max(0.0, min(1.0, (z - 0.78) / 0.12))


def assign_follow_weights(obj, factors):
    hips = obj.vertex_groups.get('Hips') or obj.vertex_groups.new(name='Hips')
    spine = obj.vertex_groups.get('Spine02') or obj.vertex_groups.new(name='Spine02')
    indices = list(range(len(obj.data.vertices)))
    for group in obj.vertex_groups:
        group.remove(indices)
    for index, factor in enumerate(factors):
        factor = max(0.0, min(1.0, factor))
        hips.add([index], 1 - factor, 'REPLACE')
        if factor > 0:
            spine.add([index], factor, 'REPLACE')
    obj['attachmentBone'] = 'Hips/Spine02 continuous torso field'
    obj['weightField'] = 'Z<=0.78: Hips1; above: Spine02=clamp((Z-0.78)/0.12)'


def apply_sash_follow_weights(band, connector=None):
    """띠 상단은 본체 허리의 연속 필드를 따르고 나머지 소품은 골반에 남긴다."""
    assign_follow_weights(band, [torso_spine_weight((band.matrix_world @ vertex.co).z) for vertex in band.data.vertices])
    if connector is not None:
        neck = Vector((-0.291076, -0.285, 0.798074))
        points = [connector.matrix_world @ vertex.co for vertex in connector.data.vertices]
        start = max(points, key=lambda point: (point - neck).length)
        length = max((point - neck).length for point in points)
        start_weight = torso_spine_weight(start.z)
        # 병 목까지의 거리 비율로 접점의 척추 가중치를 부드럽게 0으로 만든다.
        assign_follow_weights(connector, [start_weight * max(0.0, min(1.0, ((point - neck).length - 0.005) / max(0.001, length - 0.005))) for point in points])


def band_geometry_diagnostics(band, body, pants):
    bm = bmesh.new()
    bm.from_mesh(band.data)
    boundary = sum(edge.is_boundary for edge in bm.edges)
    non_manifold = sum(not edge.is_manifold for edge in bm.edges)
    volume = bm.calc_volume(signed=True)
    bm.free()
    builder = SashBuilder.__new__(SashBuilder)
    builder.trees = [world_bvh(body), world_bvh(pants)]
    builder.origin_y = 0.007
    clearances = []
    for vertex in band.data.vertices:
        point = band.matrix_world @ vertex.co
        radius = math.hypot(point.x, point.y - builder.origin_y)
        angle = math.atan2(point.y - builder.origin_y, point.x)
        clearances.append(radius - builder.radial_surface(angle, point.z))
    band.data.calc_loop_triangles()
    triangles = [tuple(triangle.vertices) for triangle in band.data.loop_triangles]
    points = [band.matrix_world @ vertex.co for vertex in band.data.vertices]
    tree = BVHTree.FromPolygons(points, triangles, all_triangles=True)
    candidates = tree.overlap(tree)
    intersections = {(min(a, b), max(a, b)) for a, b in candidates if a != b and not set(triangles[a]).intersection(triangles[b])}
    sums = [sum(group.weight for group in vertex.groups) for vertex in band.data.vertices]
    return {'boundaryEdges': boundary, 'nonManifoldEdges': non_manifold, 'signedVolume': volume, 'nonAdjacentTriangleOverlapPairs': len(intersections), 'radialClearanceRange': [min(clearances), max(clearances)], 'weightSumRange': [min(sums), max(sums)], 'maximumInfluences': max(len(vertex.groups) for vertex in band.data.vertices)}


def catmull_rom(points, t):
    index = min(len(points) - 2, int(t * (len(points) - 1)))
    local = t * (len(points) - 1) - index
    p0 = points[max(0, index - 1)]
    p1 = points[index]
    p2 = points[index + 1]
    p3 = points[min(len(points) - 1, index + 2)]
    return 0.5 * ((2 * p1) + (-p0 + p2) * local + (2 * p0 - 5 * p1 + 4 * p2 - p3) * local**2 + (-p0 + 3 * p1 - 3 * p2 + p3) * local**3)


class SashBuilder:
    def __init__(self, body, pants, rig):
        self.rig = rig
        self.trees = [world_bvh(body), world_bvh(pants)]
        self.material = self.make_material()
        self.origin_y = 0.007

    def make_material(self):
        material = bpy.data.materials.new('Folded dark brown sash cloth')
        material.use_nodes = True
        material.diffuse_color = (0.145, 0.061, 0.030, 1)
        material.use_backface_culling = False
        shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        shader.inputs['Base Color'].default_value = material.diffuse_color
        shader.inputs['Roughness'].default_value = 0.97
        shader.inputs['Metallic'].default_value = 0
        if 'Specular IOR Level' in shader.inputs:
            shader.inputs['Specular IOR Level'].default_value = 0.16
        if 'Sheen Weight' in shader.inputs:
            shader.inputs['Sheen Weight'].default_value = 0
            shader.inputs['Sheen Roughness'].default_value = 0.8
        colors = material.node_tree.nodes.new('ShaderNodeVertexColor')
        colors.layer_name = COLOR_ATTRIBUTE
        material.node_tree.links.new(colors.outputs['Color'], shader.inputs['Base Color'])
        return material

    def mesh(self, name, positions, faces, shades):
        mesh = bpy.data.meshes.new(name + 'Geometry')
        mesh.from_pydata(positions, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        mesh.materials.append(self.material)
        colors = mesh.color_attributes.new(name=COLOR_ATTRIBUTE, type='FLOAT_COLOR', domain='POINT')
        palette = Vector((0.145, 0.061, 0.030))
        for index, shade in enumerate(shades):
            color = palette * max(0.52, min(1.30, shade))
            colors.data[index].color = (*color, 1)
        for face in mesh.polygons:
            face.use_smooth = True
        obj.vertex_groups.new(name='Hips').add(list(range(len(positions))), 1, 'REPLACE')
        modifier = obj.modifiers.new('Ataho shared rig', 'ARMATURE')
        modifier.object = self.rig
        obj.parent = self.rig
        obj.matrix_parent_inverse = self.rig.matrix_world.inverted()
        obj.matrix_world = Matrix.Identity(4)
        obj['attachmentBone'] = 'Hips'
        obj['construction'] = 'closed cloth mesh with folds and exported vertex colors'
        return obj

    def radial_surface(self, angle, z):
        origin = Vector((0, self.origin_y, z))
        direction = Vector((math.cos(angle), math.sin(angle), 0))
        distances = []
        for tree in self.trees:
            point = origin.copy()
            for _ in range(12):
                hit = tree.ray_cast(point, direction, 0.8)[0]
                if hit is None:
                    break
                distances.append((hit - origin).dot(direction))
                point = hit + direction * 0.0002
        return max(distances, default=0.32)

    def front_surface(self, x, z):
        # 배꼽 앞의 띠 표면에서 시작해, 따로 떠 있는 매듭을 만들지 않는다.
        hits = []
        for tree in self.trees:
            hit = tree.ray_cast(Vector((x, -1.5, z)), Vector((0, 1, 0)), 3)[0]
            if hit is not None:
                hits.append(hit.y)
        return min(hits, default=-0.32) - 0.018

    def band(self):
        count = 160
        levels = 15
        positions = []
        shades = []
        faces = []
        for side in range(2):
            for level in range(levels):
                t = level / (levels - 1)
                for index in range(count):
                    angle = index * 2 * math.pi / count
                    back = (math.sin(angle) + 1) * 0.5
                    bottom = 0.718 + 0.012 * back
                    top = 0.798 + 0.025 * back
                    z = bottom * (1 - t) + top * t
                    z += 0.0025 * math.sin(2 * angle + 0.25) + 0.002 * math.cos(angle) * (2 * t - 1)
                    fold = math.sin(t * 4.4 * math.pi + angle * 0.3)
                    ridge = 0.0025 * fold * math.sin(math.pi * t)
                    ridge += 0.0015 * math.sin(11 * angle + 4 * t) * math.sin(math.pi * t)
                    # 안쪽 12~14mm, 바깥쪽 16~18mm 여유 안에서만 천 접힘을 만든다.
                    ridge = max(0.0, min(0.002, ridge * 0.25 + 0.001))
                    radius = self.radial_surface(angle, z) + 0.016 + ridge - side * 0.004
                    positions.append(Vector((math.cos(angle) * radius, self.origin_y + math.sin(angle) * radius, z)))
                    # 폭 방향 접힌 명암은 정점색에도 남겨 GLB의 단색 판 느낌을 줄인다.
                    shades.append(0.97 + 0.12 * fold - 0.08 * abs(2 * t - 1) - side * 0.05)
        layer = count * levels
        for side in range(2):
            offset = side * layer
            for level in range(levels - 1):
                for index in range(count):
                    nxt = (index + 1) % count
                    face = (offset + level * count + index, offset + level * count + nxt, offset + (level + 1) * count + nxt, offset + (level + 1) * count + index)
                    # 겉·안 quad를 같은 대각선으로 나누어 비평면 면의 교차를 막는다.
                    triangles = [(face[0], face[1], face[2]), (face[0], face[2], face[3])]
                    faces.extend(triangles if side == 0 else [tuple(reversed(triangle)) for triangle in triangles])
        for edge in (0, levels - 1):
            for index in range(count):
                nxt = (index + 1) % count
                a, b = edge * count + index, edge * count + nxt
                face = (a, a + layer, b + layer, b)
                triangles = [(face[0], face[1], face[2]), (face[0], face[2], face[3])]
                faces.extend(triangles if edge == 0 else [tuple(reversed(triangle)) for triangle in triangles])
        return self.mesh('SashBand', positions, faces, shades)

    def ribbon_geometry(self, controls, width, twist, amplitude, phase=0, segments=48, rounded_ends=False):
        controls = [Vector(point) for point in controls]
        sections = [-1, -0.88, -0.60, -0.28, 0, 0.28, 0.60, 0.88, 1]
        positions = []
        shades = []
        faces = []
        front = Vector((0, -1, 0))
        thickness = 0.0038
        for side in range(2):
            for index in range(segments + 1):
                t = index / segments
                center = catmull_rom(controls, t)
                before = catmull_rom(controls, max(0, t - 0.001))
                after = catmull_rom(controls, min(1, t + 0.001))
                tangent = (after - before).normalized()
                across = front.cross(tangent).normalized()
                across = Quaternion(tangent, twist * math.sin(t * math.pi * 0.9)) @ across
                normal = tangent.cross(across).normalized()
                half_width = width * 0.5 * (1 - 0.18 * t) * (1 + 0.025 * math.sin(9 * t + phase))
                if rounded_ends:
                    half_width *= 0.46 + 0.54 * math.sin(math.pi * t)**0.35
                for u in sections:
                    crease = math.cos(u * math.pi * 1.7 + 0.45 * math.sin(t * 5 + phase))
                    fold = amplitude * crease * (0.5 + 0.5 * math.sin(t * math.pi))
                    edge_curl = 0.002 * abs(u)**4 * math.sin(t * 8 + phase)
                    depth = fold + edge_curl + (0.5 - side) * thickness
                    point = center + across * (u * half_width) + normal * depth
                    # 끝단도 반듯한 사각 절단면이 아니라 부드럽게 한 번 접힌 윤곽으로 둔다.
                    if t > 0.93:
                        point += tangent * (0.003 * (1 - u * u) * (t - 0.93) / 0.07)
                    positions.append(point)
                    shades.append(0.95 + 0.14 * crease + 0.035 * math.sin(t * 15 + u * 3 + phase) - side * 0.04)
        width_count = len(sections)
        layer = (segments + 1) * width_count
        for side in range(2):
            offset = side * layer
            for row in range(segments):
                for column in range(width_count - 1):
                    a = offset + row * width_count + column
                    face = (a, a + 1, a + width_count + 1, a + width_count)
                    faces.append(face if side == 0 else tuple(reversed(face)))
        for row in range(segments):
            for column in (0, width_count - 1):
                a = row * width_count + column
                b = (row + 1) * width_count + column
                face = (a, b, b + layer, a + layer)
                faces.append(face if column == 0 else tuple(reversed(face)))
        for row in (0, segments):
            for column in range(width_count - 1):
                a = row * width_count + column
                face = (a, a + layer, a + 1 + layer, a + 1)
                faces.append(face if row == 0 else tuple(reversed(face)))
        return positions, faces, shades

    def ribbon(self, name, controls, width, twist, amplitude, phase=0):
        return self.mesh(name, *self.ribbon_geometry(controls, width, twist, amplitude, phase))

    def knot(self, y):
        center = Vector((0.015, y - 0.020, 0.762))
        strips = [
            ([(-0.049, 0.010, -0.025), (-0.024, -0.004, -0.008), (0.008, -0.012, 0.013), (0.044, 0.008, 0.027)], 0.041, 0.15, 0.004, 0.5),
            ([(-0.032, 0.008, 0.029), (-0.013, -0.020, 0.015), (0.008, -0.024, -0.004), (0.031, 0.006, -0.028)], 0.048, -0.2, 0.005, 1.8),
        ]
        positions, faces, shades = [], [], []
        for controls, width, twist, amplitude, phase in strips:
            points, polygons, colors = self.ribbon_geometry([center + Vector(point) for point in controls], width, twist, amplitude, phase, segments=20, rounded_ends=True)
            offset = len(positions)
            positions.extend(points)
            faces.extend(tuple(index + offset for index in face) for face in polygons)
            shades.extend(colors)
        return self.mesh('SashKnot', positions, faces, shades)

    def connector(self, band):
        neck = Vector((-0.291076, -0.285, 0.798074))
        start = min((band.matrix_world @ vertex.co for vertex in band.data.vertices), key=lambda point: (point - neck).length).copy()
        controls = [start, start.lerp(neck, 0.40) + Vector((0, -0.007, -0.007)), start.lerp(neck, 0.75) + Vector((0, -0.008, -0.008)), neck]
        positions, faces, shades = [], [], []
        segments, sides = 20, 10
        for index in range(segments + 1):
            t = index / segments
            center = catmull_rom(controls, t)
            tangent = (catmull_rom(controls, min(1, t + 0.002)) - catmull_rom(controls, max(0, t - 0.002))).normalized()
            across = tangent.cross(Vector((0, 0, 1))).normalized()
            normal = tangent.cross(across).normalized()
            for column in range(sides):
                angle = column * 2 * math.pi / sides
                radius = 0.0036 + 0.0003 * math.sin(angle * 3 + t * 28)
                positions.append(center + radius * (across * math.cos(angle) + normal * math.sin(angle)))
                shades.append(1.10 + 0.10 * math.sin(angle * 3 + t * 28))
        for row in range(segments):
            for column in range(sides):
                nxt = (column + 1) % sides
                faces.append((row * sides + column, row * sides + nxt, (row + 1) * sides + nxt, (row + 1) * sides + column))
        faces.append(tuple(reversed(tuple(range(sides)))))
        faces.append(tuple(segments * sides + index for index in range(sides)))
        return self.mesh('FlaskConnector', positions, faces, shades)

    def build(self):
        band = self.band()
        front = [vertex.co.y for vertex in band.data.vertices if abs(vertex.co.x - 0.015) < 0.060 and 0.735 < vertex.co.z < 0.795]
        y = min(front, default=self.front_surface(0.015, 0.762))
        knot = self.knot(y)
        tail1 = self.ribbon('SashTail1', [(-0.005, y - 0.012, 0.767), (-0.020, y - 0.030, 0.663), (-0.052, y - 0.050, 0.505), (-0.061, y - 0.037, 0.350)], 0.075, 0.22, 0.0055, 0.2)
        tail2 = self.ribbon('SashTail2', [(0.034, y - 0.020, 0.766), (0.056, y - 0.043, 0.684), (0.092, y - 0.066, 0.553), (0.094, y - 0.055, 0.455)], 0.065, -0.27, 0.0048, 1.6)
        connector = self.connector(band)
        apply_sash_follow_weights(band, connector)
        return [band, knot, tail1, tail2, connector]


def build_sash(body, pants, rig):
    """부모 통합에 world 좌표와 Hips 가중치를 보존한 천 메시만 반환한다."""
    return SashBuilder(body, pants, rig).build()


def standalone_preview():
    output = ROOT / 'public/assets/maplestory/ataho-meshy-outfit/20261016/fitted/parts/sash-concept'
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.fps = 30
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'public/assets/maplestory/ataho-meshy-outfit/20261016/fitted/concept/ataho-outfit.blend'))
    scene = bpy.context.scene
    rig = bpy.data.objects['AtahoRig']
    body = bpy.data.objects['AtahoBody']
    pants = bpy.data.objects['Pants']
    for obj in list(scene.objects):
        if obj.name.startswith('Sash') or obj.name == 'FlaskConnector' or obj.name == 'Icosphere':
            bpy.data.objects.remove(obj, do_unlink=True)
    rig.animation_data_clear()
    rig.data.pose_position = 'POSE'
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    parts = build_sash(body, pants, rig)
    for name, degrees in [('LeftArm', 65), ('RightArm', -65)]:
        bone = rig.pose.bones[name]
        rest = bone.bone.matrix_local.to_quaternion()
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = rest.inverted() @ Quaternion((0, 1, 0), math.radians(degrees)) @ rest
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [rig, *parts]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(output / 'ataho-sash-concept.glb'), use_selection=True, export_animations=False, export_skins=True, export_yup=True, export_extras=True)
    for obj in list(scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)
    data = bpy.data.cameras.new('SashConceptReviewCamera')
    camera = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(camera)
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 1.95
    scene.camera = camera
    for name, location, energy, size in [('Key', (2, -3, 4), 280, 4), ('Fill', (-3, -2, 2), 150, 4), ('Rim', (1, 2, 3), 180, 3)]:
        data = bpy.data.lights.new('SashReview' + name, 'AREA')
        data.energy = energy
        data.size = size
        obj = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector((0, 0, 0.8)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    scene.world = bpy.data.worlds.new('SashConceptReviewWorld')
    scene.world.color = (0.16, 0.18, 0.21)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    for name, location, target, scale in [('front', (0, -4, 0.83), (0, 0, 0.83), 1.95), ('three-quarter', (-3, -4, 1.1), (0, 0, 0.81), 1.95), ('detail', (0, -3, 0.62), (0, 0, 0.62), 0.92)]:
        camera.location = location
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = scale
        scene.render.filepath = str(output / f'sash-concept-{name}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'fit-sash-concept.blend'))
    report = {'status': 'concept-sash-ready-for-parent-integration', 'previewScope': '현재 concept 통합본의 몸체·옷·소품을 읽어 새 띠만 교체한 팔내림 정지 포즈.', 'paidCredits': 0, 'materials': 'dark brown cloth with geometry folds and GLB vertex colors; no external texture', 'parts': {}}
    for obj in parts:
        points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        report['parts'][obj.name] = {'vertices': len(points), 'polygons': len(obj.data.polygons), 'bounds': {'min': [min(point[axis] for point in points) for axis in range(3)], 'max': [max(point[axis] for point in points) for axis in range(3)]}, 'skin': 'continuous Hips/Spine02' if obj.name in ['SashBand', 'FlaskConnector'] else 'Hips weight 1.0', 'vertexColor': COLOR_ATTRIBUTE}
    report['bandGeometry'] = band_geometry_diagnostics(parts[0], body, pants)
    (output / 'diagnostics.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('SASH_CONCEPT', json.dumps(report, ensure_ascii=False))


def review_weight_follow(final_geometry=False):
    output = ROOT / 'public/assets/maplestory/ataho-meshy-outfit/20261016/fitted/parts/sash-concept'
    output.mkdir(parents=True, exist_ok=True)
    source = ROOT / 'public/assets/maplestory/ataho-meshy-outfit/20261016/fitted/concept/ataho-outfit.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    rig = bpy.data.objects['AtahoRig']
    band = bpy.data.objects['SashBand']
    body = bpy.data.objects['AtahoBody']
    pants = bpy.data.objects['Pants']
    action = bpy.data.actions['AtahoRun']
    rig.animation_data_clear()
    rig.animation_data_create()
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    rig.data.pose_position = 'POSE'
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    camera = scene.camera
    camera.location = (2.8, 4, 1.30)
    camera.rotation_euler = (Vector((0, 0, 0.78)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 1.18
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    report = {'sourceBlendReadOnly': str(source.relative_to(ROOT)), 'scope': 'source Run action and body/props/geometry unchanged; only SashBand weights changed in memory', 'before': band_geometry_diagnostics(band, body, pants), 'renders': []}
    variants = ['before', 'after']
    if final_geometry:
        band.hide_render = True
        band = SashBuilder(body, pants, rig).band()
        report['scope'] = 'source Run action and body/props unchanged; only corrected SashBand geometry and continuous weights replaced in memory'
        variants = ['final']
    for variant in variants:
        if variant in ['after', 'final']:
            apply_sash_follow_weights(band)
        for frame in [7, 13]:
            scene.frame_set(frame)
            name = f'sash-follow-run-{frame:02d}-{variant}.png'
            scene.render.filepath = str(output / name)
            bpy.ops.render.render(write_still=True)
            report['renders'].append(name)
    report['after'] = band_geometry_diagnostics(band, body, pants)
    report['bandSpine02Range'] = [min(torso_spine_weight((band.matrix_world @ vertex.co).z) for vertex in band.data.vertices), max(torso_spine_weight((band.matrix_world @ vertex.co).z) for vertex in band.data.vertices)]
    report_name = 'weight-follow-final-review.json' if final_geometry else 'weight-follow-review.json'
    (output / report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('WEIGHT_FOLLOW_REVIEW', json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    if '--review-final' in sys.argv:
        review_weight_follow(final_geometry=True)
    elif '--review-follow' in sys.argv:
        review_weight_follow()
    else:
        standalone_preview()
