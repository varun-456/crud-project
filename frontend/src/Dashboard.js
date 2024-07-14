// src/components/Dashboard.js
import React, { useState } from 'react';
import { Container, Row, Col, Card, Navbar, Nav, Dropdown, DropdownButton } from 'react-bootstrap';
import { FaUserCircle } from 'react-icons/fa';
import UploadFile from './FileUpload';
import ManageFiles from './ManageFiles';
import './DashBoard.css';

const Dashboard = ({ user }) => {
  const [refreshFiles, setRefreshFiles] = useState(false);

  const handleUpload = () => {
    setRefreshFiles(!refreshFiles); // Toggle refreshFiles to force ManageFiles component to re-fetch files
  };

  return (
    <div>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto">
              <Nav.Link href="/dashboard">Dashboard</Nav.Link>
              <Nav.Link href="/logout">Logout</Nav.Link>
            </Nav>
            <Navbar.Brand className="mx-auto">Document Management System</Navbar.Brand>
            <Nav className="ml-auto">
              <DropdownButton
                align="end"
                title={<FaUserCircle size={24} />}
                id="dropdown-menu-align-right"
                variant="secondary"
              >
                <Dropdown.ItemText>
                  <div className="dropdown-header">
                    <FaUserCircle size={48} />
                    <div className="user-info">
                      <h5>{user.email}</h5>
                      <p>{user.role}</p>
                    </div>
                  </div>
                </Dropdown.ItemText>
                <Dropdown.Divider />
                <Dropdown.Item href="#">Profile</Dropdown.Item>
                <Dropdown.Item href="#">Settings</Dropdown.Item>
                <Dropdown.Item href="/logout">Logout</Dropdown.Item>
              </DropdownButton>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="mt-5">
        {user.role === 'Lawyer' && (
          <Row>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Upload File</Card.Title>
                  <UploadFile user={user} onUpload={handleUpload} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>Manage Files</Card.Title>
                  <ManageFiles user={user} key={refreshFiles} />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
        {/* Add more dashboard content based on user role */}
      </Container>
    </div>
  );
};

export default Dashboard;
