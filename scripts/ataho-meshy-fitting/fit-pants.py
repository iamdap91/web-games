"""아타호 바지의 막힌 입구를 열고 기존 본체 리그에 맞춘다.

실행: Blender --background --python scripts/ataho-meshy-fitting/fit-pants.py
원본은 보존하며 fitted/parts/pants/에 재현 가능한 보정 결과를 저장한다.
-- --concept를 붙이면 기존 결과를 보존하고 parts/pants-concept/에 컨셉 보정본을 만든다.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "public/assets/maplestory"
OUTPUT = BASE / "ataho-meshy-outfit/20261016/fitted/parts/pants"
BODY_PATH = BASE / "ataho-meshy-body/20261016/rigging/ataho-body-rigged.glb"
PANTS_PATH = BASE / "ataho-meshy-outfit/20261016/models/ataho-pants.glb"


def import_asset(path):
    previous = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return list(set(bpy.data.objects) - previous)


def mesh_bounds(obj):
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return [[min(point[i] for point in points), max(point[i] for point in points)] for i in range(3)]


def smoothstep(start, end, value):
    t = min(1.0, max(0.0, (value - start) / (end - start)))
    return t * t * (3.0 - 2.0 * t)


def boundary_components(bm):
    remaining = {edge for edge in bm.edges if edge.is_boundary}
    components = []
    while remaining:
        stack = [remaining.pop()]
        edges = set(stack)
        while stack:
            edge = stack.pop()
            for vertex in edge.verts:
                for neighbor in vertex.link_edges:
                    if neighbor in remaining:
                        remaining.remove(neighbor)
                        edges.add(neighbor)
                        stack.append(neighbor)
        vertices = {vertex for edge in edges for vertex in edge.verts}
        components.append({
            "edges": len(edges),
            "vertices": len(vertices),
            "bounds": [[min(vertex.co[i] for vertex in vertices), max(vertex.co[i] for vertex in vertices)] for i in range(3)],
            "closedLoop": all(sum(edge in edges for edge in vertex.link_edges) == 2 for vertex in vertices),
        })
    return sorted(components, key=lambda item: item["edges"], reverse=True)


def open_pants(pants):
    bm = bmesh.new()
    bm.from_mesh(pants.data)
    raw_count = len(bm.verts)
    # UV는 루프에 저장되므로 같은 위치의 이음새를 용접해도 원본 텍스처를 유지한다.
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
    welded_count = len(bm.verts)
    initial_faces = len(bm.faces)
    initial_boundaries = boundary_components(bm)
    waist_normal = Vector((0.0, -0.3735, 1.0)).normalized()
    bmesh.ops.bisect_plane(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        dist=0.000001,
        plane_co=Vector((0.0, 0.0, 0.775)),
        plane_no=waist_normal,
        clear_outer=True,
        clear_inner=False,
    )
    waist_faces = len(bm.faces)
    # 두 발목의 막힌 바닥을 같은 높이에서 잘라 실제 통로를 만든다.
    bmesh.ops.bisect_plane(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        dist=0.000001,
        plane_co=Vector((0.0, 0.0, -0.80)),
        plane_no=Vector((0.0, 0.0, -1.0)),
        clear_outer=True,
        clear_inner=False,
    )
    bottom_faces = len(bm.faces)
    loose = [vertex for vertex in bm.verts if not vertex.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    # 원래 기울어진 허리를 수평으로 하고, 넓은 통과 발목 주름은 위치별 비율로 유지한다.
    for vertex in bm.verts:
        x, y, z = vertex.co
        effective_z = z - 0.3735 * y * smoothstep(0.30, 0.65, z)
        t = min(1.0, max(0.0, (effective_z + 0.80) / 1.575))
        x_scale = 0.37 + 0.06 * smoothstep(0.0, 0.32, t) + 0.24 * smoothstep(0.58, 1.0, t)
        y_scale = 0.58 + 0.50 * smoothstep(0.45, 1.0, t)
        vertex.co = (x * x_scale - 0.004, y * y_scale - 0.025, 0.17 + 0.57 * t)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    final_boundaries = boundary_components(bm)
    non_manifold_edges = sum(len(edge.link_faces) > 2 for edge in bm.edges)
    bm.to_mesh(pants.data)
    bm.free()
    pants.data.update()
    return {
        "rawVertices": raw_count,
        "weldedVertices": welded_count,
        "rawFaces": initial_faces,
        "facesAfterWaistCut": waist_faces,
        "facesAfterAnkleCut": bottom_faces,
        "initialBoundariesAfterWeld": initial_boundaries,
        "remainingNonManifoldEdges": non_manifold_edges,
        "openBoundaries": final_boundaries,
        "waistCutOriginalPlane": "z - 0.3735*y = 0.775; positive side removed",
        "ankleCutOriginalPlane": "z = -0.80; negative side removed",
        "targetWaistZ": 0.74,
        "targetAnkleZ": 0.17,
        "removedCaps": ["waist", "left ankle", "right ankle"],
        "method": "UV-preserving seam weld, plane bisect, nonlinear width/depth fit",
    }


def geometry_profile(points):
    slices = []
    for height in [0.18, 0.22, 0.32, 0.37, 0.47, 0.57, 0.62, 0.67, 0.72, 0.74]:
        selected = [point for point in points if abs(point.z - height) < 0.012]
        if selected:
            slices.append({"height": height, "width": max(point.x for point in selected) - min(point.x for point in selected), "depth": max(point.y for point in selected) - min(point.y for point in selected)})
    return {"slices": slices, "centralCrotchMinimumZ": min(point.z for point in points if abs(point.x + 0.004) < 0.012)}


def reshape_concept(pants):
    original = [vertex.co.copy() for vertex in pants.data.vertices]
    bm = bmesh.new()
    bm.from_mesh(pants.data)
    bm.verts.ensure_lookup_table()
    # 기하에 솟은 잘게 꺾인 주름만 완화하고 UV와 큰 통 실루엣은 유지한다.
    movable = [vertex for vertex in bm.verts if not vertex.is_boundary]
    for _ in range(44):
        bmesh.ops.smooth_vert(bm, verts=movable, factor=0.45, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    maximum_relaxation = 0.0
    for vertex in bm.verts:
        source = original[vertex.index]
        z = source.z
        influence = smoothstep(0.205, 0.265, z) * (1.0 - smoothstep(0.675, 0.735, z)) * 0.68
        delta = (vertex.co - source) * influence
        if delta.length > 0.027:
            delta *= 0.027 / delta.length
        maximum_relaxation = max(maximum_relaxation, delta.length)
        vertex.co = source + delta
        x, y, z = vertex.co
        outer = smoothstep(0.25, 0.40, abs(x + 0.004))
        x = -0.004 + (x + 0.004) * (1.0 - 0.025 * outer)
        volume = smoothstep(0.22, 0.30, z) * (1.0 - smoothstep(0.55, 0.70, z))
        x = -0.004 + (x + 0.004) * (1.0 + 0.061 * volume)
        upper = smoothstep(0.50, 0.60, z) * (1.0 - smoothstep(0.685, 0.74, z))
        y = -0.025 + (y + 0.025) * (1.0 - 0.13 * upper)
        if y < -0.025:
            y = -0.025 + (y + 0.025) * (1.0 - 0.13 * smoothstep(0.67, 0.74, z))
        central = math.exp(-((x + 0.004) / 0.115) ** 2)
        rise = smoothstep(0.25, 0.40, z) * (1.0 - smoothstep(0.50, 0.70, z))
        z -= 0.060 * central * rise
        # 발목의 긴 조거 밴드를 짧고 단순한 접힌 단으로 만든다.
        cuff = 1.0 - smoothstep(0.198, 0.228, source.z)
        if cuff > 0.0:
            center_x = 0.196 if x > -0.004 else -0.207
            dx = (x - center_x) / 0.065
            dy = (y + 0.023) / 0.075
            radius = max(math.sqrt(dx * dx + dy * dy), 0.001)
            target_x = center_x + (x - center_x) / radius
            target_y = -0.023 + (y + 0.023) / radius
            x = x * (1.0 - 0.82 * cuff) + target_x * 0.82 * cuff
            y = y * (1.0 - 0.82 * cuff) + target_y * 0.82 * cuff
        if z < 0.215:
            z = 0.17 + (z - 0.17) * 0.56
        elif z < 0.275:
            z -= 0.0198 * (1.0 - smoothstep(0.215, 0.275, z))
        vertex.co = (x, y, z)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(pants.data)
    bm.free()
    pants.data.update()
    return {
        "variant": "concept",
        "baselineProfile": geometry_profile(original),
        "fittedProfile": geometry_profile([vertex.co for vertex in pants.data.vertices]),
        "maximumRelaxationDistance": maximum_relaxation,
        "foldRelaxation": "44 local smoothing passes, blended 68%, displacement limited to 0.027m; boundary UV and topology retained",
        "outerWidthReductionMaximum": 0.025,
        "lowerLegWidthCompensationMaximum": 0.061,
        "upperDepthReductionMaximum": 0.13,
        "frontWaistProjectionReductionMaximum": 0.13,
        "centralRiseDropMaximum": 0.060,
        "cuffHeightScale": 0.56,
        "cuffRadialReliefBlend": 0.82,
        "waistPreservedZ": 0.74,
        "anklePreservedZ": 0.17,
        "bodyMaskCompatibility": "same .185<Z<.74 lower-body mask; verify motion overlap after assembly",
    }


def concept_weights(point):
    x = point.x + 0.004
    hips = smoothstep(0.43, 0.66, point.z)
    central = 1.0 - smoothstep(0.035, 0.12, abs(x))
    hips = max(hips, central * smoothstep(0.30, 0.425, point.z))
    left = smoothstep(-0.12, 0.12, x)
    upper = smoothstep(0.29, 0.48, point.z)
    foot = 0.25 * (1.0 - smoothstep(0.17, 0.225, point.z))
    weights = {"Hips": hips}
    for side, side_weight in [("Left", left), ("Right", 1.0 - left)]:
        remainder = (1.0 - hips) * side_weight
        weights[side + "UpLeg"] = remainder * upper
        weights[side + "Leg"] = remainder * (1.0 - upper) * (1.0 - foot)
        weights[side + "Foot"] = remainder * (1.0 - upper) * foot
    return weights


def build_weight_sources(body, side):
    positions = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
    groups = {group.index: group.name for group in body.vertex_groups}
    triangles = []
    for face in body.data.polygons:
        center = sum((positions[index] for index in face.vertices), Vector()) / len(face.vertices)
        if center.z > 0.94:
            continue
        if side * center.x < -0.025:
            continue
        triangles.append(tuple(face.vertices))
    return positions, triangles, groups, BVHTree.FromPolygons(positions, triangles, all_triangles=True)


def transfer_weights(pants, body, rig, concept=False):
    sources = {side: build_weight_sources(body, side) for side in (-1, 1)}
    names = [bone.name for bone in rig.data.bones]
    groups = {name: pants.vertex_groups.new(name=name) for name in names}
    allowed = {"Hips", "Spine02", "Spine01", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"}
    maximum_distance = 0.0
    zero_vertices = 0
    max_influences = 0
    sums = []
    for vertex in pants.data.vertices:
        if concept:
            weights = concept_weights(vertex.co)
        else:
            side = 1 if vertex.co.x >= -0.004 else -1
            positions, triangles, source_groups, tree = sources[side]
            nearest, normal, face_index, distance = tree.find_nearest(vertex.co)
            maximum_distance = max(maximum_distance, distance)
            triangle = triangles[face_index]
            a, b, c = [positions[index] for index in triangle]
            bary = barycentric_transform(nearest, a, b, c, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
            weights = {}
            for source_index, factor in zip(triangle, bary):
                for group in body.data.vertices[source_index].groups:
                    name = source_groups[group.group]
                    if name not in allowed:
                        continue
                    opposite = "Right" if side > 0 else "Left"
                    if name.startswith(opposite) and abs(vertex.co.x + 0.004) > 0.025:
                        continue
                    weights[name] = weights.get(name, 0.0) + max(0.0, factor) * group.weight
            # 좁은 사타구니 중앙은 골반을 섞어 다리 좌우가 당기는 갈라짐을 줄인다.
            center = 1.0 - smoothstep(0.0, 0.065, abs(vertex.co.x + 0.004))
            groin = smoothstep(0.43, 0.59, vertex.co.z) * center * 0.7
            for name in weights:
                weights[name] *= 1.0 - groin
            weights["Hips"] = weights.get("Hips", 0.0) + groin
        picked = sorted(((name, value) for name, value in weights.items() if value > 0.00001), key=lambda item: item[1], reverse=True)[:4]
        total = sum(value for name, value in picked)
        if total <= 0.0:
            picked = [("Hips", 1.0)]
            total = 1.0
            zero_vertices += 1
        for name, value in picked:
            groups[name].add([vertex.index], value / total, "REPLACE")
        sums.append(sum(value / total for name, value in picked))
        max_influences = max(max_influences, len(picked))
    modifier = pants.modifiers.new("AtahoBodyRig", "ARMATURE")
    modifier.object = rig
    # 기존 리그가 0.01 스케일이므로 parent inverse를 써서 월드상의 바지 크기를 보존한다.
    pants.parent = rig
    pants.matrix_parent_inverse = rig.matrix_world.inverted()
    pants.matrix_basis = Matrix.Identity(4)
    return {
        "boneNames": names,
        "maximumInfluences": max_influences,
        "weightSumRange": [min(sums), max(sums)],
        "fallbackHipVertices": zero_vertices,
        "maximumBodyProjectionDistance": None if concept else maximum_distance,
        "method": "continuous pelvis/leg profile with central crotch Hips blending; top 4 normalized" if concept else "side-filtered nearest source triangle barycentric body weight transfer; top 4 normalized",
    }


def add_camera(name, position, target, scale):
    camera_data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name, camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = scale
    bpy.context.scene.camera = camera
    return camera


def render_views(body, pants, concept=False):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 768
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    if scene.world is None:
        scene.world = bpy.data.worlds.new("ReviewWorld")
    scene.world.color = (0.12, 0.12, 0.12)
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.display.shading.background_type = "WORLD"
    if concept:
        scene.render.engine = "BLENDER_EEVEE"
        scene.world.use_nodes = True
        background = next(node for node in scene.world.node_tree.nodes if node.type == "BACKGROUND")
        background.inputs["Color"].default_value = (0.18, 0.21, 0.25, 1.0)
        background.inputs["Strength"].default_value = 0.5
        scene.view_settings.view_transform = "Standard"
        for name, position, energy in [("Key", (-2, -3, 4), 190), ("Fill", (3, -2, 2), 120), ("Rim", (0, 3, 3), 100)]:
            light_data = bpy.data.lights.new("Concept" + name, "AREA")
            light_data.energy = energy
            light_data.shape = "DISK"
            light_data.size = 4.0
            light = bpy.data.objects.new("Concept" + name, light_data)
            bpy.context.collection.objects.link(light)
            light.location = position
            light.rotation_euler = (Vector((0, 0, 0.8)) - light.location).to_track_quat("-Z", "Y").to_euler()
    views = [
        ("front", (0, -4, 0.85), (0, 0, 0.82), 1.88),
        ("side", (4, 0, 0.85), (0, 0, 0.82), 1.88),
        ("waist", (0.1, -1.8, 2.3), (0, 0, 0.47), 1.05),
    ]
    if concept:
        views.insert(1, ("three-quarter", (2.4, -4, 1.1), (0, 0, 0.82), 1.88))
    for name, position, target, scale in views:
        camera = add_camera("Review-" + name, position, target, scale)
        body.hide_render = name == "waist"
        scene.render.filepath = str(OUTPUT / (name + ".png"))
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(camera, do_unlink=True)
    body.hide_render = False


def main():
    global OUTPUT
    parser = argparse.ArgumentParser()
    parser.add_argument("--concept", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.concept:
        OUTPUT = BASE / "ataho-meshy-outfit/20261016/fitted/parts/pants-concept"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    body_objects = import_asset(BODY_PATH)
    rig = next(obj for obj in body_objects if obj.type == "ARMATURE")
    body = max((obj for obj in body_objects if obj.type == "MESH"), key=lambda obj: len(obj.data.vertices))
    body.name = "AtahoBodyReference"
    rig.name = "AtahoBodyRigReference"
    # glTF 임포터가 사용자 정의 본 표시용 Icosphere도 만들기 때문에 검토/내보내기 대상에서 제외한다.
    for obj in body_objects:
        if obj.type == "MESH" and obj != body:
            obj.hide_render = True
            obj.hide_set(True)
    if rig.animation_data:
        rig.animation_data_clear()
    for pose_bone in rig.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
    pants = next(obj for obj in import_asset(PANTS_PATH) if obj.type == "MESH")
    pants.name = "Pants"
    pants.data.transform(pants.matrix_world)
    pants.matrix_world = Matrix.Identity(4)
    topology = open_pants(pants)
    concept_shape = reshape_concept(pants) if args.concept else None
    if args.concept:
        fitted_bmesh = bmesh.new()
        fitted_bmesh.from_mesh(pants.data)
        topology["openBoundaries"] = boundary_components(fitted_bmesh)
        fitted_bmesh.free()
    weights = transfer_weights(pants, body, rig, concept=args.concept)
    material_values = []
    for material in pants.data.materials:
        shader = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
        if shader:
            material_values.append({"name": material.name, "roughness": shader.inputs["Roughness"].default_value, "metallic": shader.inputs["Metallic"].default_value})
            if args.concept:
                shader.inputs["Roughness"].default_value = 0.9
                shader.inputs["Metallic"].default_value = 0.0
    for material in pants.data.materials:
        material.use_backface_culling = False
    bpy.context.view_layer.update()
    diagnostics = {
        "sourceBody": str(BODY_PATH.relative_to(ROOT)),
        "sourcePants": str(PANTS_PATH.relative_to(ROOT)),
        "sourceBodyWorldBounds": mesh_bounds(body),
        "fittedPantsWorldBounds": mesh_bounds(pants),
        "topology": topology,
        "weights": weights,
        "conceptShape": concept_shape,
        "coordinateSystem": "Blender Z up, body import world preserved; Pants matrix_world identity",
        "texture": "original material/image and per-loop UV retained",
        "originalMaterialValues": material_values,
        "limitations": [
            "걷기·달리기를 포함한 통합 동작에서 최종 관통 확인 필요",
            "안쪽 두께나 봉제 단면은 추가하지 않음",
            "원본 사타구니의 미세한 비다양체 이음새 일부가 남아 있으며 전체 메시의 완전한 다양체성은 보장하지 않음",
            "몸체의 가려지는 부분 제거 및 꼬리 뚫림은 통합 단계에서 판단",
        ],
    }
    if args.concept:
        # 팔을 내린 정지 포즈는 보기만 바꾸며 리그의 rest와 뼈 개수는 유지한다.
        for name, angle in [("LeftArm", -67), ("RightArm", 67)]:
            bone = rig.pose.bones[name]
            bone.rotation_mode = "XYZ"
            bone.rotation_euler.z = math.radians(angle)
        bpy.context.view_layer.update()
    render_views(body, pants, concept=args.concept)
    if args.concept:
        for bone in rig.pose.bones:
            bone.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    pants.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = pants
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / "ataho-pants-fitted.glb"), export_format="GLB", use_selection=True, export_animations=False, export_skins=True, export_yup=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "fit-pants.blend"))
    (OUTPUT / "diagnostics.json").write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2) + "\n")
    print("PANTS_DIAGNOSTICS", json.dumps(diagnostics, ensure_ascii=False))


if __name__ == "__main__":
    main()
