import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Documents = ({ token }) => {
  const [documents, setDocuments] = useState([]);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await axios.get('http://localhost:5000/all-hashes', {
          headers: { 'x-auth-token': token }
        });
        setDocuments(res.data);
      } catch (err) {
        setMessage('Error fetching documents');
      }
    };

    fetchDocuments();
  }, [token]);

  const handleDownload = async (documentId) => {
    try {
      const res = await axios.get(`http://localhost:5000/retrieve/${documentId}?key=${encryptionKey}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', documentId);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setMessage('Error downloading document');
    }
  };

  return (
    <div>
      <h2>My Documents</h2>
      {message && <p>{message}</p>}
      <div>
        <input
          type="text"
          placeholder="Encryption Key"
          value={encryptionKey}
          onChange={(e) => setEncryptionKey(e.target.value)}
        />
      </div>
      <ul>
        {documents.documentIds && documents.documentIds.map((docId, index) => (
          <li key={index}>
            {docId}
            <button onClick={() => handleDownload(docId)}>Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Documents;
