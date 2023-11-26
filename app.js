// Getting access to the canvas in the html page
const canvas = document.getElementById('renderCanvas');
// Passing the canvas to the engine, we will be able to put the objects onto the canvas
const engine = new BABYLON.Engine(canvas, true);

let HEIGHT = 1;
let GROUND_HEIGHT = 3;
let GROUND_WIDTH = 3;


// Function to create Scene
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    
    const camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 4, 4, BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0));

    return scene;
}

// Creating scene
const scene = createScene();

// Creating Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", {height: GROUND_HEIGHT, width: GROUND_WIDTH, subdivisions: 4}, scene);
const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
groundMaterial.alpha = 0.05; // Adjust alpha for transparency
ground.material = groundMaterial;
ground.renderingGroupId = 0; // This will ensure that the lines are visible



// Variables to manipulate the HTML 
const drawBtn = document.getElementById('draw-btn');
const extrudeBtn = document.getElementById('extrude-btn');
const moveBtn = document.getElementById('move-btn');
const vrtxBtn = document.getElementById('vertex-edit-btn');

drawBtn.addEventListener('click', () => setMode('draw'));
extrudeBtn.addEventListener('click', () => extrudeShape());
moveBtn.addEventListener('click', () => setMode('move'));
vrtxBtn.addEventListener('click', () => setMode('vedit'));

// Global Variables Used
var selected_marker = null
var isDraggingMarker = false
var isDragging = false;
var isHighlight = false;
var selectedMesh = null;

let currentMode = null;
const shapePoints = [];

// This will set the mode of the APP
// there are 3 modes
// 1. draw - User will be able to draw points on the ground
// 2. move - User will be able to move the extruded object on the ground
// 3. vedit - User will be able to move the vertices around
function setMode(mode) {
    currentMode = mode;
    // TODO: Implement mode-specific actions (e.g., enable/disable buttons, handle interactions)
    
    if(mode == 'draw'){
        drawBtn.disabled = true
    }
    else if(mode == 'vedit'){
        drawBtn.disabled = true;
        extrudeBtn.disabled = true;
        moveBtn.disabled = true;
        vrtxBtn.disabled = true
    }

    console.log('Mode Selected:', mode);

}


// Added event listeners to get the Mouse clicks and the mouse movements
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointermove', onPointerMove);


/*
    Mouse Down. Here we will basically deal with the left mouse click
    1. mode == Draw ? 
        We will take the points picked on the ground. And we will mark the points on the ground.
    2. mode == move ?
        We will select the mesh, which needs to be moved around
    3. mode == vedit ? highlight == False
        We will select the mesh, then **highlight** the vertices which the user will move.
    4. mode == vedit ? highlight == True
        We will select the highlighted vertex. this selected vertex will later be moved when mouse is dragged.
*/
function onPointerDown(event) {
    
    if (currentMode == 'draw' && event.button == 0){
        var pickInfo = scene.pick(scene.pointerX, scene.pointerY);
        
        if (pickInfo.hit && pickInfo.pickedMesh === ground) {
            // The click hit the ground, get the intersection point
            var groundIntersectionPoint = pickInfo.pickedPoint;
            console.log('Intersection point on ground:', groundIntersectionPoint);
            shapePoints.push(new BABYLON.Vector3(groundIntersectionPoint.x, groundIntersectionPoint.y, groundIntersectionPoint.z));
            
            var marker = createMarker(groundIntersectionPoint);
        }
    }
    else if (currentMode == 'move' && event.button == 0){
        // For now i am keeping only to be moved by the left click

        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit) {
            console.log(pickResult.pickedMesh)
            if (pickResult.pickedMesh.name === 'polygon') {
                isDragging = true;
                selectedMesh = pickResult.pickedMesh;
            }
        }

    }
    else if (currentMode == 'vedit' && event.button == 0 && !isHighlight){

        // Here first i should pick where the button hit
        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit) {
            console.log(pickResult.pickedMesh)
            if (pickResult.pickedMesh.name === 'polygon') {

                // If it hit the polygon i should highlight its vertices.

                isHighlight = true;
                selectedMesh = pickResult.pickedMesh;
                highLightVertices(pickResult.pickedMesh); // this will highlight the vertices which can be edited
            }
        }

    }
    else if (currentMode == 'vedit' && event.button == 0 && isHighlight){

        // Here what we should do is that we need to pick the where the button is hit
        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit) {
            console.log(pickResult.pickedMesh);
            if (pickResult.pickedMesh.name === 'marker') {

                selected_marker = pickResult.pickedMesh;
                isDraggingMarker = true
            }
        }

    }
    else{
        return;
    }

}

/*
    Mouse UP. Here we will basically deal with right mouse click.
    1. mode == draw?
        Then we will complete the polygon on the surface of the ground.
        And then make the extrude button enabled.
    2. mode == move?
        We will set the draggin surface as false.
        So, user will be able to newly click on any surface and try to move it around.
    3. mode == vedit?
        Same case as above.
*/
function onPointerUp(event) {

    if (currentMode == 'draw' && event.button == 2){
        const polygon = BABYLON.MeshBuilder.CreatePolygon("polygon_2d", {shape:shapePoints, sideOrientation: BABYLON.Mesh.DOUBLESIDE } , scene);

        extrudeBtn.disabled = false
        currentMode = null
    }
    else if(currentMode == 'move'){
        isDragging = false;
        selectedMesh = null;
        startingPoint = null;
    }
    else if (currentMode == 'vedit' && isDraggingMarker){
        isDraggingMarker = false;
        selected_marker = null;
    }
    else{
        return;
    }
}

/*
    Drag the Object
    
    1. Drag the mesh
        This will drag the selected mesh
    2. Drag the vertex.
        This will drag the selected vertex of the mesh. 
*/
function onPointerMove(event) {
    
    if(isDragging)
    {
        var next = getGroundPosition(event);
        
        var current_pos = selectedMesh.position

        //current.y = selectedMesh.position.y;
        if (next == null){
            next = current_pos;
        }

        changePositionOfMesh(selectedMesh, current_pos, next)
    }
    else if(isDraggingMarker){

        // Here as we reach we must have selected a marker.
        // Our task here is to we have to change the position of not only the marker but as well as of the vertex.
        // Lets first change the location of the marker
        var next = getGroundPosition(event);
        var current_location_of_mesh = selected_marker.position;
        // console.log("Current location of mesh")
        // console.log(current_location_of_mesh)
        
        if (next == null){
            next = current_location_of_mesh;
        }

        // From the selected marker, we need to select the polygon also.
        // We need to update the vertex of the selected mesh to the next
        changeVertexPositionMesh(selectedMesh, current_location_of_mesh, next);

        changePositionOfMesh(selected_marker, current_location_of_mesh, next, update_y = true);
    }
    else{
        return;
    }

}



engine.runRenderLoop(() => {
    scene.render();
});






/*
    Useful functions
*/

// 1. createMarker - This takes the position of the point, and then creates the black colored marker at that point.
function createMarker(position) {
    var marker = BABYLON.MeshBuilder.CreateSphere('marker', { diameter: 0.03 }, scene);
    marker.position.copyFrom(position);
    marker.material = new BABYLON.StandardMaterial('markerMaterial', scene);
    marker.material.diffuseColor = new BABYLON.Color3(0, 0, 0);  // Black color for the marker
    return marker;
}

function removeMeshesByName(scene, meshName) {
    scene.meshes.forEach(function (mesh) {
        if (mesh.name === meshName) {
            mesh.dispose();
        }
    });
}

// The role of this function is to make the vertives of the picked_mesh as 
// small dots. 
// The vertices which are above the ground
function highLightVertices(picked_mesh){

    var positions = picked_mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    
    var matrix = picked_mesh.getWorldMatrix();  // Get the world transformation matrix

    var transformedVertices = [];
    var tempVector = BABYLON.Vector3.Zero();

    for (var i = 0; i < positions.length; i += 3) {

        tempVector.x = positions[i];
        tempVector.y = positions[i + 1];
        tempVector.z = positions[i + 2];

        // Apply the mesh's transformation to the vertex

        BABYLON.Vector3.TransformCoordinatesToRef(tempVector, matrix, tempVector);

        transformedVertices.push(tempVector.clone());
    }


    var total_polygon_vertices = 2*shapePoints.length
    console.log(total_polygon_vertices)

    // that means i have to go through first total_polygon_vertices vertices coordinates and mark them

    console.log(transformedVertices)

    var originalVertices = []
    for (var i = 0; i < total_polygon_vertices; i += 1) {
        originalVertices.push(transformedVertices[i]);
    }

    // console.log(originalVertices)

    for (var i=0; i<originalVertices.length; i+=1){

        
        if(originalVertices[i].y != 0){

            createMarker(originalVertices[i]);

        }

    }
}


function changePositionOfMesh(mesh_to_be_changed_location, starting_location, current_location, update_y = false){

    var delta = current_location.subtract(starting_location);
        // selectedMesh.position.addInPlace(delta);

        var new_position_x = mesh_to_be_changed_location.position.x + delta.x;
        var new_position_z = mesh_to_be_changed_location.position.z + delta.z;
        var new_position_y = mesh_to_be_changed_location.position.y + delta.y;

        if(new_position_x < -GROUND_WIDTH/2){
            new_position_x = -GROUND_WIDTH/2;
        }
        else if(new_position_x > GROUND_WIDTH/2){
            new_position_x = GROUND_WIDTH/2;
        }

        if(new_position_z < -GROUND_HEIGHT/2){
            new_position_z = -GROUND_HEIGHT/2;
        }
        else if(new_position_z > GROUND_HEIGHT/2){
            new_position_z = GROUND_HEIGHT/2;
        }


        mesh_to_be_changed_location.position.x = new_position_x;
        if(update_y == true){
            mesh_to_be_changed_location.position.y = new_position_y;
        }
        mesh_to_be_changed_location.position.z = new_position_z;

        starting_location = current_location;

    return current_location;
}

/*
    This function will change the vertex coordinate of the selectedMesh
    
    where the vertex position is close to the current_location_of_mesh

    The vertex location would be update to next.
*/
function changeVertexPositionMesh(selected_mesh, current_location_of_marker, next){

    var positions = selected_mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    
    var matrix = selected_mesh.getWorldMatrix();  // Get the world transformation matrix
    var inverseWorldMatrix = BABYLON.Matrix.Identity();

    // Calculate the inverse transformation and store it in the 'inverseWorldMatrix'
    matrix.invertToRef(inverseWorldMatrix); 

    var transformedVertices = [];
    var tempVector = BABYLON.Vector3.Zero();

    for (var i = 0; i < positions.length; i += 3) {

        tempVector.x = positions[i];
        tempVector.y = positions[i + 1];
        tempVector.z = positions[i + 2];

        // Apply the mesh's transformation to the vertex

        BABYLON.Vector3.TransformCoordinatesToRef(tempVector, matrix, tempVector);

        transformedVertices.push(tempVector.clone());
    }


    // Now i got the transformed Vertices.
    // console.log("Current Location")
    // console.log(current_location_of_marker)
    // console.log("Positions")
    // console.log(transformedVertices)

    // I am **inverting** the worldtransformation matrix.
    tempVector.x = next.x;
    tempVector.y = next.y;
    tempVector.z = next.z;
    BABYLON.Vector3.TransformCoordinatesToRef(tempVector, inverseWorldMatrix, tempVector);


    for(var i = 0;i<transformedVertices.length;i++){

        var xx = transformedVertices[i].x;
        var yy = transformedVertices[i].y;
        var zz = transformedVertices[i].z;

        var vertex = new BABYLON.Vector3(xx, yy, zz);

        var distance = BABYLON.Vector3.Distance(vertex, current_location_of_marker);
        
        // console.log("Distance")
        // console.log(distance)

        if (distance < 0.1){
            console.log("Came here")
            // We need to update this vertex

            // We need to update the position
            positions[i*3] = tempVector.x;
            positions[i*3 + 1] = tempVector.y;
            positions[i*3 + 2] = tempVector.z;
        }

    }

    selected_mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions, false, false);
}

/*
    Extrude the shape drawn on the ground to a certain height.
*/
function extrudeShape(){

    const extrudedPolygon = BABYLON.MeshBuilder.ExtrudePolygon("polygon", {shape:shapePoints, depth: HEIGHT, sideOrientation: BABYLON.Mesh.DOUBLESIDE , updatable: true});
    
    extrudedPolygon.position.y = HEIGHT

    // Below two lines will remove the 2D polygon that we showed. Also the markers of the user points
    removeMeshesByName(scene, "marker");
    removeMeshesByName(scene, "polygon_2d");

    extrudeBtn.disabled = true
    moveBtn.disabled = false
    vrtxBtn.disabled = false
}

function getGroundPosition(event) {
    var pickInfo = scene.pick(scene.pointerX, scene.pointerY);
    if (pickInfo.hit) {
        // console.log(pickInfo.pickedPoint)
        return pickInfo.pickedPoint;
    }
    return null;
}