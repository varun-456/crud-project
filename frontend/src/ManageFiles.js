import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ManageFiles.css';

const ManageFiles = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileHistory, setSelectedFileHistory] = useState([]);
  const [message, setMessage] = useState('');

  const fetchFiles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/user-files', { params: { from: user.ethereumAddress } });
      setFiles(response.data);
    } catch (error) {
      setMessage('Error fetching files');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user.ethereumAddress]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleModify = async (documentId) => {
    if (!selectedFile) {
      setMessage('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('from', user.ethereumAddress);

    try {
      const response = await axios.post(`http://localhost:5000/modify/${documentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.msg);
      setSelectedFile(null);
      fetchFiles(); // Refresh the list after modification
    } catch (error) {
      setMessage('Error modifying file');
    }
  };

  const handleDelete = async (documentId) => {
    try {
      await axios.delete(`http://localhost:5000/delete/${documentId}`, { data: { from: user.ethereumAddress } });
      setFiles(files.filter(file => file.documentId !== documentId));
      setMessage('File deleted successfully');
    } catch (error) {
      setMessage('Error deleting file');
    }
  };

  const handleView = (documentId) => {
    window.open(`http://localhost:5000/retrieve/${documentId}?from=${user.ethereumAddress}`);
  };

  const handleHistory = async (documentId) => {
    try {
      const response = await axios.get(`http://localhost:5000/history/${documentId}`, { params: { from: user.ethereumAddress } });
      setSelectedFileHistory(response.data.formattedHistory);
    } catch (error) {
      setMessage('Error fetching file history');
    }
  };

  return (
    <div className="manage-files-container">
      <h2>Manage Files</h2>
      {message && <p className={message.includes('Error') ? 'error' : 'success'}>{message}</p>}
      <table className="table table-bordered table-hover">
        <thead className="thead-dark">
          <tr>
            <th>Document ID</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.documentId}>
              <td>{file.documentId}</td>
              <td>
                <button className="btn btn-primary" onClick={() => handleView(file.documentId)}>View</button>
                <button className="btn btn-warning" onClick={() => handleModify(file.documentId)}>Modify</button>
                <button className="btn btn-danger" onClick={() => handleDelete(file.documentId)}>Delete</button>
                <button className="btn btn-secondary" onClick={() => handleHistory(file.documentId)}>History</button>
                <input type="file" className="form-control mt-2" onChange={handleFileChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedFileHistory.length > 0 && (
        <div className="terminal">
          <h3>File History</h3>
          {selectedFileHistory.map((history, index) => (
            <div key={index} className="history-item">
              <p><strong>Version:</strong> {history.version}</p>
              <p><strong>Timestamp:</strong> {new Date(history.timestamp * 1000).toLocaleString()}</p>
              <p><strong>Action:</strong> {history.action}</p>
              <p><strong>Hash:</strong> {history.hash}</p>
              <p><strong>User:</strong> {history.address}</p>
              <hr />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageFiles;
