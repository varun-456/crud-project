import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const AdminPanel = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/users');
        setUsers(response.data);
      } catch (err) {
        setError('Error fetching users');
      }
    };

    const fetchFiles = async () => {
      try {
        const response = await axios.get('http://localhost:5000/all-user-files', { params: { from: user.ethereumAddress } });
        const fetchedFiles = [];
        response.data.forEach(userFile => {
          userFile.documentIds.forEach(documentId => {
            fetchedFiles.push({ documentId, owner: userFile.user });
          });
        });
        console.log(fetchFiles)
        setFiles(fetchedFiles);
      } catch (err) {
        setError('Error fetching files');
      }
    };

    if (user) {
      fetchUsers();
      fetchFiles();
    }
  }, [user]);

  const handleApprove = async (userId, role) => {
    try {
      await axios.post('http://localhost:5000/assign-role', { userId, role });
      setUsers(users.map(user => (user._id === userId ? { ...user, isApproved: true, role } : user)));
    } catch (err) {
      setError('Error approving user');
    }
  };

  const handleDeleteFile = async (documentId) => {
    try {
      await axios.delete(`http://localhost:5000/delete/${documentId}`, { data: { from: user.ethereumAddress } });
      setFiles(files.filter(file => file.documentId !== documentId));
      setError('File deleted successfully');
    } catch (error) {
      setError('Error deleting file');
    }
  };

  const handleDownloadFile = (documentId) => {
    window.open(`http://localhost:5000/retrieve/${documentId}?from=${user.ethereumAddress}`);
  };

  return (
    <div className="container admin-panel-container mt-5">
      <h2 className="text-center mb-4">Admin Panel</h2>
      {error && <p className="text-danger text-center">{error}</p>}
      
      <h3 className="mb-4">Users</h3>
      <table className="table table-bordered table-hover mb-5">
        <thead className="thead-dark">
          <tr>
            <th>Email</th>
            <th>Address</th>
            <th>Phone Number</th>
            <th>Ethereum Address</th>
            <th>Role</th>
            <th>Approved</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.email}</td>
              <td>{user.address}</td>
              <td>{user.phoneNumber}</td>
              <td>{user.ethereumAddress}</td>
              <td>{user.role}</td>
              <td>{user.isApproved ? 'Yes' : 'No'}</td>
              <td>
                {!user.isApproved && (
                  <div className="input-group">
                    <select
                      onChange={(e) => handleApprove(user._id, e.target.value)}
                      className="form-control"
                      defaultValue=""
                    >
                      <option value="" disabled>Select role</option>
                      <option value="Lawyer">Lawyer</option>
                      <option value="Client">Client</option>
                    </select>
                    <div className="input-group-append">
                      <button className="btn btn-success" onClick={() => handleApprove(user._id, user.role)}>
                        Approve
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mb-4">Files</h3>
      <table className="table table-bordered table-hover">
        <thead className="thead-dark">
          <tr>
            <th>Document ID</th>
            <th>Owner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.documentId}>
              <td>{file.documentId}</td>
              <td>{file.owner}</td>
              <td>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDownloadFile(file.documentId)}
                >
                  Download
                </button>
                <button className="btn btn-danger" onClick={() => handleDeleteFile(file.documentId)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanel;
