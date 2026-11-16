import bpy,json,os
mapping={'Brick':'GreyBricks.jpg','GreyBrick2':'GreyBricks2.jpg','GreyBricks':'GreyBricks.jpg','DoorType1_2':'DoorType1_2.jpg','LogEdgeWeathered':'TreeLogEdgeWeathered.jpg','Plaster':'Plaster.jpg','RoofTiles':'RoofTiles.jpg','RustedMetal':'Rusted Metal.jpg','Stone':'Stone.jpg','WindowBlue1':'WindowBlue1','WindowBlue2':'WindowsBlue2.jpg','Wood':'Wood.jpg'}
for m in list(bpy.data.materials):
    if m.library: m.make_local()
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.88
    bs.inputs['Metallic'].default_value=0
    image=bpy.data.images.get(mapping.get(m.name.split('.')[0],''))
    if image:
        n=m.node_tree.nodes.new('ShaderNodeTexImage'); n.image=image
        m.node_tree.links.new(n.outputs['Color'],bs.inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.join()
o=bpy.context.object
# Apply source modifiers and export only the building; no source camera/lights.
report={'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'dimensions':list(o.dimensions),'materials':len(o.data.materials)}
print('EXPORT_REPORT',json.dumps(report))
bpy.ops.export_scene.gltf(filepath=os.path.abspath('public/assets/medieval_house_02.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=85)
