import { useEffect, useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Fetch messages
  const fetchMessages = () => {
    fetch('/api/messages')
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Add new message
  const addMessage = async () => {
    if (!input.trim()) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: input
        })
      });

      setInput('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'Arial',
        maxWidth: '600px',
        margin: 'auto'
      }}
    >
      <h1>3 Tier Kubernetes Project</h1>

      <h2>React + NodeJS + MySQL</h2>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            padding: '10px',
            width: '70%',
            marginRight: '10px'
          }}
        />

        <button
          onClick={addMessage}
          style={{
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>

      <div>
        <h3>Messages from MySQL DB:</h3>

        {messages.length === 0 ? (
          <p>No messages found</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: '10px',
                border: '1px solid #ccc',
                marginBottom: '10px',
                borderRadius: '5px'
              }}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;