"""생성된 술병을 원본 몸체 좌표에 맞춰 Hips 강체 부품으로 보존한다."""

import json
import math
import struct
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[2]
BODY_PATH = ROOT / "public/assets/maplestory/ataho-meshy-body/20261016/rigging/ataho-body-rigged.glb"
FLASK_PATH = ROOT / "public/assets/maplestory/ataho-meshy-outfit/20261016/models/ataho-flask.glb"
OUTPUT = ROOT / "public/assets/maplestory/ataho-meshy-outfit/20261016/fitted/parts/flask"


def bounds(obj):
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return (
        Vector(tuple(min(p[i] for p in points) for i in range(3))),
        Vector(tuple(max(p[i] for p in points) for i in range(3))),
    )


def import_objects(path):
    previous = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in previous]


def inspect_body_clearance(body, flask, attachment):
    points = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
    tree = BVHTree.FromPolygons(points, [list(face.vertices) for face in body.data.polygons])
    clearances = []
    for vertex in flask.data.vertices:
        point = flask.matrix_world @ vertex.co
        hit = tree.ray_cast(Vector((point.x, -2, point.z)), Vector((0, 1, 0)), 4)[0]
        if hit is not None:
            clearances.append(hit.y - point.y)
    point = attachment.location
    neck_hit = tree.ray_cast(Vector((point.x, -2, point.z)), Vector((0, 1, 0)), 4)[0]
    return {
        "method": "rest-pose body front-surface projection along Blender +Y",
        "projectedFlaskVertices": len(clearances),
        "minimumFrontClearance": min(clearances) if clearances else None,
        "verticesBehindBodyFront": sum(value < 0 for value in clearances),
        "attachmentProjectsOutsideBody": neck_hit is None,
        "scope": "원래 본체와 정적 포즈만 검사. 최종 의상과 애니메이션 간섭은 통합 단계에서 확인.",
    }


def inspect_export(path):
    payload = path.read_bytes()
    json_length = struct.unpack_from("<I", payload, 12)[0]
    document = json.loads(payload[20:20 + json_length])
    primitive = document["meshes"][0]["primitives"][0]
    positions = document["accessors"][primitive["attributes"]["POSITION"]]
    weights = document["accessors"][primitive["attributes"]["WEIGHTS_0"]]
    view = document["bufferViews"][weights["bufferView"]]
    start = 20 + json_length + 8 + view.get("byteOffset", 0) + weights.get("byteOffset", 0)
    sums = [sum(struct.unpack_from("<4f", payload, start + i * view.get("byteStride", 16))) for i in range(weights["count"])]
    return {
        "vertices": positions["count"],
        "weightSumRange": [min(sums), max(sums)],
        "skinJoints": len(document["skins"][0]["joints"]),
        "note": "UV와 법선 경계의 정점 분리로 GLB의 정점 수가 증가할 수 있다. 원본 Blend의 정점과 면은 보존한다.",
    }


def point_camera(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name, location, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    point_camera(obj, (0, 0, 0.8))


def render_review(body, flask, output):
    # 별도의 배경 프로세스에서만 카메라와 조명을 만든다.
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.13, 0.13, 0.13)
    scene.view_settings.view_transform = "Standard"
    for obj in scene.objects:
        obj.hide_render = obj.type == "MESH" and obj not in {body, flask}
    data = bpy.data.cameras.new("FlaskReviewCamera")
    camera = bpy.data.objects.new("FlaskReviewCamera", data)
    bpy.context.collection.objects.link(camera)
    data.type = "ORTHO"
    data.ortho_scale = 2.1
    camera.location = (0, -4, 0.83)
    point_camera(camera, (0, 0, 0.83))
    scene.camera = camera
    add_area_light("FlaskReviewKey", (-2, -3, 4), 170, 4)
    add_area_light("FlaskReviewFill", (2, -1, 2), 90, 3)
    add_area_light("FlaskReviewRim", (0, 2, 3), 120, 3)
    scene.render.filepath = str(output / "body-flask-front.png")
    bpy.ops.render.render(write_still=True)
    camera.location = (-3, -4, 1.1)
    point_camera(camera, (0, 0, 0.8))
    scene.render.filepath = str(output / "body-flask-three-quarter.png")
    bpy.ops.render.render(write_still=True)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    body_objects = import_objects(BODY_PATH)
    rig = next(obj for obj in body_objects if obj.type == "ARMATURE")
    body = next(obj for obj in body_objects if obj.type == "MESH" and obj.vertex_groups)
    # 입력의 단일 키 정적 클립을 제거해 이후 마스터 리그 액션만 적용한다.
    rig.animation_data_clear()
    rig.data.pose_position = "REST"
    body_min, body_max = bounds(body)
    body_height = body_max.z - body_min.z
    flask_objects = import_objects(FLASK_PATH)
    flask = next(obj for obj in flask_objects if obj.type == "MESH")
    flask.name = "Flask"
    flask.data.name = "FlaskGeometry"
    source_min, source_max = bounds(flask)
    source_center = (source_min + source_max) * 0.5
    original_matrix = flask.matrix_world.copy()
    target_height = body_height * 0.20
    scale = target_height / (source_max.z - source_min.z)
    rotation = Matrix.Rotation(math.radians(8), 4, "Y")
    center = Vector((-0.305, -0.285, 0.699))
    fitting = Matrix.Translation(center) @ rotation @ Matrix.Scale(scale, 4) @ Matrix.Translation(-source_center)
    for vertex in flask.data.vertices:
        vertex.co = fitting @ original_matrix @ vertex.co
    flask.matrix_world = Matrix.Identity(4)
    for group in list(flask.vertex_groups):
        flask.vertex_groups.remove(group)
    hips_group = flask.vertex_groups.new(name="Hips")
    hips_group.add(list(range(len(flask.data.vertices))), 1.0, "REPLACE")
    armature_modifier = flask.modifiers.new("FollowHips", "ARMATURE")
    armature_modifier.object = rig
    armature_modifier.use_vertex_groups = True
    # 본의 긴 꼬리 좌표를 피하고 일반 부모 관계에서도 world 좌표를 보존한다.
    flask.parent = rig
    flask.matrix_parent_inverse = rig.matrix_world.inverted()
    flask.matrix_world = Matrix.Identity(4)
    flask["attachmentBone"] = "Hips"
    flask["attachmentMode"] = "rigid-vertex-group"
    flask["frontAxisBlender"] = "-Y"
    flask["sourceAsset"] = str(FLASK_PATH.relative_to(ROOT))
    flask["heightRatioToBody"] = 0.20
    flask.data.update()
    fitted_min, fitted_max = bounds(flask)
    # 목의 끈 높이에 후속 허리끈과 연결할 표시를 world 좌표로 둔다.
    attachment = bpy.data.objects.new("FlaskSashAttachment", None)
    bpy.context.collection.objects.link(attachment)
    attachment.location = fitting @ Vector((source_center.x, source_center.y, source_min.z + 0.81 * (source_max.z - source_min.z)))
    attachment.empty_display_type = "SPHERE"
    attachment.empty_display_size = 0.015
    attachment["attachmentBone"] = "Hips"
    attachment["coordinateSpace"] = "Blender world; meters; Z up; front -Y"
    attachment["purpose"] = "후속 허리끈에서 술병 목으로 연결할 위치 기준"
    attachment["followsAnimation"] = False
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and obj not in {body, flask}:
            obj.hide_set(True)
            obj.hide_render = True
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (rig, flask, attachment):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = flask
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "ataho-flask-fitted.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_extras=True,
        export_skins=True,
        export_yup=True,
    )
    for image in bpy.data.images:
        if image.source == "FILE":
            image.pack()
    diagnostics = {
        "status": "fitted-rigid-part-ready-for-master-rig",
        "coordinateSpace": {"up": "Z", "front": "-Y", "unit": "meter", "characterRight": "-X"},
        "sourceBody": str(BODY_PATH.relative_to(ROOT)),
        "sourceFlask": str(FLASK_PATH.relative_to(ROOT)),
        "bodyHeight": body_height,
        "sourceBounds": {"min": list(source_min), "max": list(source_max)},
        "uniformScale": scale,
        "rotationRadiansXYZ": [0, math.radians(8), 0],
        "centerWorld": list(center),
        "fittedBounds": {"min": list(fitted_min), "max": list(fitted_max)},
        "fittedSize": list(fitted_max - fitted_min),
        "actualHeightRatioToBody": (fitted_max.z - fitted_min.z) / body_height,
        "attachment": {"object": attachment.name, "bone": "Hips", "positionWorld": list(attachment.location), "mode": "all vertices Hips weight 1.0; armature modifier; no bone parenting"},
        "mesh": {"vertices": len(flask.data.vertices), "polygons": len(flask.data.polygons), "materialSlots": len(flask.data.materials), "uvLayers": len(flask.data.uv_layers)},
        "bodyClearance": inspect_body_clearance(body, flask, attachment),
        "exportObservation": inspect_export(OUTPUT / "ataho-flask-fitted.glb"),
        "preserved": ["source topology", "UV", "4K base-color texture", "stopper", "neck rope", "knot", "tassel"],
        "pending": ["의상 확정 후 허리띠와 목 끈 연결", "걷기와 달리기에서 옷 또는 오른다리와의 간섭 확인", "부모 통합 시 동일 이름 Hips를 가진 master armature로 modifier 대상 변경"],
        "outputs": ["fit-flask.blend", "ataho-flask-fitted.glb", "body-flask-front.png", "body-flask-three-quarter.png"],
    }
    (OUTPUT / "diagnostics.json").write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2) + "\n")
    render_review(body, flask, OUTPUT)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "fit-flask.blend"))
    print("FLASK_FITTED", json.dumps(diagnostics, ensure_ascii=False))


if __name__ == "__main__":
    main()
