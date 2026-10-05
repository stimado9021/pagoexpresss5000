// Probar chat completion con modelo deepseek-v4-flash-free
const response = await fetch('http://localhost:20128/api/v1/vscode/sk-65e4c74147ed55c6-3cf433-3dd7276c/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-65e4c74147ed55c6-3cf433-3dd7276c',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'oc/deepseek-v4-flash-free',
    messages: [{role: 'user', content: 'Hola'}]
  })
});

const text = await response.text();
console.log('Status:', response.status);
console.log('Body:', text);
