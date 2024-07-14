import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Adminpanel.css';

const AdminPanel = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [allFiles, setAllFiles] = useState([]);
  const [allHistories, setAllHistories] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/users', {
          headers: { 'x-auth-token': token }
        });
        setUsers(response.data);
      } catch (err) {
        setError('Error fetching users');
      }
    };

    fetchUsers();
  }, [token]);

  const handleApprove = async (userId, role) => {
    try {
      await axios.post('http://localhost:5000/assign-role', { userId, role }, {
        headers: { 'x-auth-token': token }
      });
      setUsers(users.map(user => (user._id === userId ? { ...user, isApproved: true, role } : user)));
    } catch (err) {
      setError('Error approving user');
    }
  };

  const fetchAllUserFiles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/all-user-files');
      const fetchedFiles = [];
      response.data.forEach(userFile => {
        userFile.documentIds.forEach(documentId => {
          fetchedFiles.push({ documentId, owner: userFile.user });
        });
      });
      setAllFiles(fetchedFiles);
    } catch (err) {
      setError('Error fetching files');
    }
  };

  const fetchAllDocumentHistories = async () => {
    try {
      const response = await axios.get('http://localhost:5000/all-document-histories', {
        headers: { 'x-auth-token': token }
      });
      setAllHistories(response.data);
    } catch (err) {
      setError('Error retrieving all document histories');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await axios.post('http://localhost:5000/backup', {}, {
        headers: { 'x-auth-token': token }
      });
      setMessage(response.data.msg);
    } catch (err) {
      setError('Error creating backup');
    }
  };

  const handleDriveToIPFS = async () => {
    try {
      const response = await axios.post('http://localhost:5000/drive-to-ipfs', {}, {
        headers: { 'x-auth-token': token }
      });
      setMessage(response.data.msg);
    } catch (err) {
      setError('Error uploading from Google Drive to IPFS');
    }
  };

  return (
    <div className="admin-panel-container">
      <h2>Admin Panel</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className={message.includes('Error') ? 'error' : 'success'}>{message}</p>}
      
      <div className="button-group">
        <button className="btn btn-info" onClick={fetchAllUserFiles}>Get All User Files</button>
        <button className="btn btn-secondary" onClick={fetchAllDocumentHistories}>Get All Document Histories</button>
        <button className="btn btn-primary" onClick={handleBackup}>Create Backup</button>
        <button className="btn btn-warning" onClick={handleDriveToIPFS}>Upload from Drive to IPFS</button>
      </div>
      
      <h3>Users</h3>
      <table className="table">
        <thead>
          <tr>
            <th className="email-field">Email</th>
            <th className="address-field">Address</th>
            <th className="phone-field">Phone Number</th>
            <th className="ethereum-field">Ethereum Address</th>
            <th className="role-field">Role</th>
            <th className="approved-field">Approved</th>
            <th className="action-field">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td className="email-field">{user.email}</td>
              <td className="address-field">{user.address}</td>
              <td className="phone-field">{user.phoneNumber}</td>
              <td className="ethereum-field">{user.ethereumAddress}</td>
              <td className="role-field">{user.role}</td>
              <td className="approved-field">{user.isApproved ? 'Yes' : 'No'}</td>
              <td className="action-field">
                {!user.isApproved && (
                  <div>
                    <select
                      onChange={(e) => handleApprove(user._id, e.target.value)}
                      className="form-select"
                      defaultValue=""
                    >
                      <option value="" disabled>Select role</option>
                      <option value="Lawyer">Lawyer</option>
                      <option value="Client">Client</option>
                    </select>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="files-section">
        <h3>All User Files</h3>
        <ul className="files-list">
          {allFiles.map((file, index) => (
            <li key={index} className="file-item">
              <strong>Document ID:</strong> {file.documentId} <br />
              <strong>Owner:</strong> {file.owner}
            </li>
          ))}
        </ul>
      </div>

      <div className="histories-section">
        <h3>All Document Histories</h3>
        {allHistories.documentIds && allHistories.documentIds.map((documentId, index) => (
          <div key={documentId} className="history-item">
            <h4>{documentId}</h4>
            {allHistories.histories[index].map((history, historyIndex) => (
              <div key={historyIndex}>
                <p><strong>Version:</strong> {history.version}</p>
                <p><strong>Timestamp:</strong> {history.timestamp}</p>
                <p className="action-field"><strong>Action:</strong> {history.action}</p>
                <p><strong>Hash:</strong> {history.hash}</p>
                <p><strong>User:</strong> {history.address}</p>
                <hr />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
