import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

useEffect(() => {
  fetch('http://localhost:5000/')
    .then((res) => res.json())
    .then((data) => {
      console.log('Fetched data:', data);
      setMessage(data.message);
    })
    .catch((err) => console.error('Error fetching backend:', err));
}, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Full Stack Test</h1>
      <p><strong>Message from backend:</strong> {message}</p>
    </div>
  );
}

export default App;


