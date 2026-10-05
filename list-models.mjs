// Listar modelos disponibles en el servidor omniroute
const response = await fetch('http://localhost:20128/api/v1/vscode/sk-65e4c74147ed55c6-3cf433-3dd7276c/models', {
  headers: {
    'Authorization': 'Bearer sk-65e4c74147ed55c6-3cf433-3dd7276c'
  }
});

const data = await response.json();
// Mostrar solo los IDs
for (const model of data.data) {
  console.log(model.id);
}
