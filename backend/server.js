const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { Web3 } = require('web3');
const { create } = require('ipfs-http-client');
const DocumentStorageArtifact = require('./build/contracts/DocumentStorage.json');
const Fernet = require('fernet');
const crypto = require('crypto');
const mongoose = require('mongoose');
// Additional imports
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const readline = require('readline');
const axios = require('axios');

// Import User model
const User = require('./models/User');
const archiver = require('archiver');
const fs = require('fs');

const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

const CLIENT_ID = '554827378692-1rkskitgqnlo24dmlqomhj1n6hp2l4c9.apps.googleusercontent.com';
const CLIENT_SECRET = '<client_secret>';
const REDIRECT_URI = 'http://localhost:5000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

let auth;

// // Load client secrets from a local file.
// fs.readFile(CREDENTIALS_PATH, (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   authorize(JSON.parse(content), (oAuth2Client) => {
//     auth = oAuth2Client;
//   });
// });

// function authorize(credentials, callback) {
//   const { client_secret, client_id, redirect_uris } = credentials.installed;
//   const oAuth2Client = new google.auth.OAuth2(
//     client_id, client_secret, redirect_uris[0]);

//   // Check if we have previously stored a token.
//   fs.readFile(TOKEN_PATH, (err, token) => {
//     if (err) return getAccessToken(oAuth2Client, callback);
//     oAuth2Client.setCredentials(JSON.parse(token));
//     callback(oAuth2Client);
//   });
// }

// function getAccessToken(oAuth2Client, callback) {
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
//   });
//   console.log('Authorize this app by visiting this url:', authUrl);
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//   rl.question('Enter the code from that page here: ', (code) => {
//     rl.close();
//     oAuth2Client.getToken(code, (err, token) => {
//       if (err) return console.error('Error retrieving access token', err);
//       oAuth2Client.setCredentials(token);
//       // Store the token to disk for later program executions
//       fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
//         if (err) console.error(err);
//         console.log('Token stored to', TOKEN_PATH);
//       });
//       callback(oAuth2Client);
//     });
//   });
// }


// Connect to MongoDB
mongoose.connect('mongodb+srv://varun:varun@hackathon.uqkr24a.mongodb.net/?retryWrites=true&w=majority&appName=Hackathon', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Signup endpoint
// Assign role to user (admin action)
app.get('/user-files', async (req, res) => {
  const { from } = req.query;

  try {
    const user = await User.findOne({ ethereumAddress: from });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const documentIds = await DocumentStorage.methods.getDocumentsByOwner(user.ethereumAddress).call();

    const documents = documentIds.map(documentId => ({ documentId }));
    console.log(documents);

    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});


app.post('/assign-role', async (req, res) => {
    try {
      const { userId, role } = req.body;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
  
      const ethereumAddress = user.ethereumAddress;
      
      // Assign role on blockchain
      const adminAddress = '0x42bdEea07713BC211D6C0978cD8600CEaa9963aC';
      const gasLimit = await DocumentStorage.methods.assignRole(ethereumAddress, roles[role]).estimateGas({ from: adminAddress });
      const gasPrice = await web3.eth.getGasPrice();
  
      await DocumentStorage.methods.assignRole(ethereumAddress, roles[role]).send({ from: adminAddress, gas: gasLimit, gasPrice });
  
      // Update user role in database
      user.role = role;
      user.isApproved = true;
      await user.save();
  
      res.status(200).json({ msg: 'Role assigned and user approved successfully' });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ msg: 'Server error' });
    }
  });
  
app.get('/users', async (req, res) => {
    try {
      const users = await User.find();
      res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ msg: 'Server error' });
    }
  });
  
  // Approve user (admin action)
  app.post('/approve/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      await User.findByIdAndUpdate(userId, { isApproved: true });
      res.status(200).json({ msg: 'User approved successfully' });
    } catch (error) {
      console.error('Error approving user:', error);
      res.status(500).json({ msg: 'Server error' });
    }
  });

function generateFernetKeyFromPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('base64');
    return key.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

app.post('/signup', async (req, res) => {
    try {
      const { email, password, address, phoneNumber, ethereumAddress, role } = req.body;
  
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Generate Fernet key from password
      const fernetKey = generateFernetKeyFromPassword(password);
      // Create new user

      user = new User({
        email,
        password: hashedPassword,
        address,
        phoneNumber,
        ethereumAddress,
        role, // Store the role
        fernetKey
      });
  
      await user.save();
      res.status(201).json({ msg: 'Signup successful! Please wait for admin approval.' });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ msg: 'Server error' });
    }
  });
  

// Login endpoint
app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
  
      // Check if user is approved
      if (!user.isApproved) {
        return res.status(403).json({ msg: 'User not approved by admin' });
      }
  
      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
  
      // Create JWT
      const token = jwt.sign({ userId: user._id }, 'jwtSecret', { expiresIn: '1h' });
  
      res.status(200).json({
        token,
        user: {
          email: user.email,
          role: user.role,
          address: user.address,
          phoneNumber: user.phoneNumber,
          ethereumAddress: user.ethereumAddress,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ msg: 'Server error' });
    }
  });
// Initialize express app

// Set up storage engine for multer to handle file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    console.log('File being uploaded:', file); // Log file details for debugging
    checkFileType(file, cb);
  }
}).single('file');

function checkFileType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  console.log('File original name:', file.originalname);
  console.log('File MIME type:', file.mimetype);
  console.log('Extension check result:', extname);
  console.log('MIME type check result:', mimetype);

  if (extname) {
    return cb(null, true);
  } else {
    return cb('Error: PDFs Only!');
  }
}

// Connect to local blockchain (Ganache)
const web3 = new Web3('http://127.0.0.1:7545');

// Load contract ABI and address
const contractABI = DocumentStorageArtifact.abi;
const networkId = Object.keys(DocumentStorageArtifact.networks)[0]; // Get the first network ID from the artifact
const contractAddress = DocumentStorageArtifact.networks[networkId].address;

const DocumentStorage = new web3.eth.Contract(contractABI, contractAddress);

const roles = {
  None: 0n,
  Admin: 1n,
  Lawyer: 2n,
  Client: 3n
};

const actions = {
  0: 'uploaded',
  1: 'modified',
  2: 'deleted',
  3: 'retrieved'
};

async function getRole(address) {
  return await DocumentStorage.methods.userRoles(address).call();
}

async function getDocumentOwner(documentId) {
  return await DocumentStorage.methods.getDocumentOwner(documentId).call();
}

async function getDocumentHistory(documentId) {
  return await DocumentStorage.methods.getDocumentHistory(documentId).call();
}

function generateFernetKey() {
  const secret = crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return secret;
}

// Function to encrypt the document using Fernet
function encryptDocument(buffer) {
  const secret = generateFernetKey();
  const key = new Fernet.Secret(secret);
  const token = new Fernet.Token({ secret: key, time: Date.now() });
  const encryptedData = token.encode(buffer.toString('base64'));
  return { key: secret, encryptedData: encryptedData };
}

function encryptDocumentWithKey(buffer, key) {
  const secret = new Fernet.Secret(key);
  const token = new Fernet.Token({ secret: secret, time: Date.now() });
  const encryptedData = token.encode(buffer.toString('base64'));
  return { key, encryptedData };
}

// Function to decrypt the document using Fernet
function decryptDocument(encryptedData, secret) {
  const key = new Fernet.Secret(secret);
  const token = new Fernet.Token({ secret: key, token: encryptedData });
  const decryptedData = token.decode();
  return Buffer.from(decryptedData, 'base64');
}

async function storeDocumentHash(documentId, documentHash, from) {
  try {
    const role = await getRole(from);

    if (role == roles.Admin || role == roles.Lawyer) {
      const gasLimit = await DocumentStorage.methods.storeDocumentHash(documentId, documentHash).estimateGas({ from });
      const gasPrice = await web3.eth.getGasPrice();

      const transaction = await DocumentStorage.methods.storeDocumentHash(documentId, documentHash).send({ from, gas: gasLimit, gasPrice });

      const storedHash = await DocumentStorage.methods.getDocumentHash(documentId).call();
      return storedHash;
    } else {
      throw new Error('Unauthorized: Only admin or lawyer can store document hash');
    }
  } catch (error) {
    console.error('Error storing document hash:', error);
    throw error;
  }
}

function generateHash(buffer) {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(buffer);
  return hashSum.digest('hex');
}

// Configure IPFS client
const ipfs = create('/ip4/127.0.0.1/tcp/5001');

async function uploadToIPFS(fileContent) {
  try {
    const result = await ipfs.add(fileContent);
    return result.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

async function retrieveFromIPFS(ipfsHash) {
  try {
    const stream = ipfs.cat(ipfsHash);
    let data = Buffer.alloc(0);
    for await (const chunk of stream) {
      data = Buffer.concat([data, chunk]);
    }
    return data;
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    throw error;
  }
}

async function unpinFromIPFS(ipfsHash) {
  try {
    await ipfs.pin.rm(ipfsHash);
    console.log(`Unpinned file from IPFS: ${ipfsHash}`);
  } catch (error) {
    console.error(`Error unpinning file from IPFS: ${ipfsHash}, error`);
  }
}

app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ msg: err });
    } else {
      if (req.file == undefined) {
        console.error('No file selected');
        return res.status(400).json({ msg: 'No file selected!' });
      } else {
        try {
          const fileBuffer = req.file.buffer;
          const { from } = req.body;
          console.log('Received from address:', from);
          console.log('Received file buffer length:', fileBuffer.length);

          const user = await User.findOne({ ethereumAddress: from });
          if (!user) {
            return res.status(404).json({ msg: 'User not found' });
          }

          const role = await getRole(from);
          console.log('Role:', role);
          if (role !== BigInt(roles.Admin) && role !== BigInt(roles.Lawyer)) {
            return res.status(403).json({ msg: 'Unauthorized: Only admin or lawyer can upload files' });
          }

          // Generate document hash
          const documentHash = generateHash(fileBuffer);

          console.log("key", user.fernetKey)
          // Encrypt the document using the user's Fernet key
          const { key, encryptedData } = encryptDocumentWithKey(fileBuffer, user.fernetKey);
          // Encrypt the document
          //const { key, encryptedData } = encryptDocument(fileBuffer);

          // Upload encrypted document to IPFS
          const ipfsHash = await uploadToIPFS(Buffer.from(encryptedData, 'utf8'));

          // Store IPFS hash on the blockchain
          const documentId = req.file.originalname;
          const storedHash = await storeDocumentHash(documentId, ipfsHash, from);
          console.log(key)
          res.status(200).json({
            msg: 'File uploaded, encrypted, stored on IPFS, and hash stored in blockchain!',
            ipfsHash,
            storedHash,
            encryptionKey: key,
          });
        } catch (error) {
          console.error('Error interacting with the blockchain or IPFS:', error);
          res.status(500).json({ msg: 'Error interacting with the blockchain or IPFS', error: error.message });
        }
      }
    }
  });
});

function decryptDocumentWithKey(encryptedData, key) {
  const secret = new Fernet.Secret(key);
  const token = new Fernet.Token({ secret: secret, token: encryptedData });
  const decryptedData = token.decode();
  return Buffer.from(decryptedData, 'base64');
}

app.get('/retrieve/:documentId', async (req, res) => {
  const documentId = req.params.documentId;
  const { from } = req.query;

  const role = await getRole(from);
  if (role !== BigInt(roles.Admin) && role !== BigInt(roles.Lawyer) && role !== BigInt(roles.Client)) {
    return res.status(403).json({ msg: 'Unauthorized: Only admin, lawyer, or client can retrieve files' });
  }

  try {
    const storedHash = await DocumentStorage.methods.getDocumentHash(documentId).call();

    if (!storedHash || storedHash === '') {
      res.status(404).json({ msg: 'Document not found on the blockchain' });
      return;
    }

    const ipfsHash = storedHash;
    const encryptedData = await retrieveFromIPFS(ipfsHash);

    const user = await User.findOne({ ethereumAddress: from });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const decryptedData = decryptDocumentWithKey(encryptedData.toString('utf8'), user.fernetKey);

    res.setHeader('Content-Disposition', `attachment; filename=${documentId}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(Buffer.from(decryptedData, 'base64')); // Send decrypted data as binary
  } catch (error) {
    res.status(500).json({ msg: 'Error retrieving the document', error: error.message });
  }
});


app.get('/all-hashes', async (req, res) => {
  const { from } = req.query;

  const role = await getRole(from);
  if (role !== BigInt(roles.Admin) && role !== BigInt(roles.Lawyer)) {
    return res.status(403).json({ msg: 'Unauthorized: Only admin or lawyer can retrieve all document hashes' });
  }

  try {
    const accounts = await web3.eth.getAccounts();
    const fromAccount = accounts[0];
    
    const result = await DocumentStorage.methods.getAllDocumentHashes().call({ from: fromAccount });

    res.status(200).json({
      documentIds: result[0],
      documentHashes: result[1]
    });
  } catch (error) {
    res.status(500).json({ msg: 'Error retrieving document hashes from the blockchain', error: error.message });
  }
});

app.delete('/delete/:documentId', async (req, res) => {
  const { documentId } = req.params;
  const { from } = req.body;

  try {
    const role = await getRole(from);
    const owner = await getDocumentOwner(documentId);

    if (role !== BigInt(roles.Admin) && owner !== from) {
      return res.status(403).json({ msg: 'Unauthorized: Only owner or admin can delete documents' });
    }

    const gasLimit = await DocumentStorage.methods.deleteDocument(documentId).estimateGas({ from });
    const gasPrice = await web3.eth.getGasPrice();

    await DocumentStorage.methods.deleteDocument(documentId).send({ from, gas: gasLimit, gasPrice });

    res.status(200).json({ msg: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ msg: 'Error deleting document', error: error.message });
  }
});

app.post('/modify/:documentId', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ msg: err });
    } else {
      if (req.file == undefined) {
        console.error('No file selected');
        return res.status(400).json({ msg: 'No file selected!' });
      } else {
        try {
          const { documentId } = req.params;
          const { from } = req.body;

          const role = await getRole(from);
          const owner = await getDocumentOwner(documentId);

          const user = await User.findOne({ ethereumAddress: from });
          if (!user) {
            return res.status(404).json({ msg: 'User not found' });
          }

          if (role !== BigInt(roles.Admin) && owner !== from) {
            return res.status(403).json({ msg: 'Unauthorized: Only owner or admin can modify documents' });
          }

          

          const fileBuffer = req.file.buffer;
          console.log('Received from address:', from);
          console.log('Received file buffer length:', fileBuffer.length);

          // Generate document hash
          const documentHash = generateHash(fileBuffer);

          // Encrypt the document
          const { key, encryptedData } = encryptDocumentWithKey(fileBuffer, user.fernetKey);

          // Upload encrypted document to IPFS
          const ipfsHash = await uploadToIPFS(Buffer.from(encryptedData, 'utf8'));

          // Modify IPFS hash on the blockchain
          const gasLimit = await DocumentStorage.methods.modifyDocumentHash(documentId, ipfsHash).estimateGas({ from });
          const gasPrice = await web3.eth.getGasPrice();
          await DocumentStorage.methods.modifyDocumentHash(documentId, ipfsHash).send({ from, gas: gasLimit, gasPrice });

          console.log(key)
          res.status(200).json({
            msg: 'File modified, encrypted, stored on IPFS, and hash updated on blockchain!',
            ipfsHash,
            encryptionKey: key,
          });
        } catch (error) {
          console.error('Error interacting with the blockchain or IPFS:', error);
          res.status(500).json({ msg: 'Error interacting with the blockchain or IPFS', error: error.message });
        }
      }
    }
  });
});

// New endpoint to get stored hash by document ID
app.get('/hash/:documentId', async (req, res) => {
  const documentId = req.params.documentId;
  const { from } = req.query;

  const role = await getRole(from);
  if (role !== BigInt(roles.Admin) && role !== BigInt(roles.Lawyer) && role !== BigInt(roles.Client)) {
    return res.status(403).json({ msg: 'Unauthorized: Only admin, lawyer, or client can retrieve document hashes' });
  }

  try {
    const storedHash = await DocumentStorage.methods.getDocumentHash(documentId).call();

    if (!storedHash || storedHash === '') {
      res.status(404).json({ msg: 'Document hash not found on the blockchain' });
      return;
    }

    res.status(200).json({ documentId, storedHash });
  } catch (error) {
    res.status(500).json({ msg: 'Error retrieving the document hash', error: error.message });
  }
});

app.get('/get-roles', async (req, res) => {
  try {
    const result = await DocumentStorage.methods.getAllRoles().call();
    const users = result[0];
    const roles = result[1];

    const userRoles = users.map((user, index) => ({
      address: user,
      role: roles[index].toString() // Convert BigInt to string
    }));

    res.status(200).json(userRoles);
  } catch (error) {
    console.error('Error retrieving user roles:', error);
    res.status(500).json({ msg: 'Error retrieving user roles', error: error.message });
  }
});

app.post('/assign-role', async (req, res) => {
  const { user, role } = req.body;
  const from = req.headers['x-admin-address'];

  try {
    const adminRole = await getRole(from);
    console.log(`Admin role: ${adminRole}`); // This will log a BigInt value

    if (adminRole !== BigInt(roles.Admin)) {
      return res.status(403).json({ msg: 'Unauthorized: Only admin can assign roles' });
    }

    const gasLimit = await DocumentStorage.methods.assignRole(user, role).estimateGas({ from });
    const gasPrice = await web3.eth.getGasPrice();

    await DocumentStorage.methods.assignRole(user, role).send({ from, gas: gasLimit, gasPrice });

    res.status(200).json({ msg: 'Role assigned successfully' });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ msg: 'Error assigning role', error: error.message });
  }
});

// New endpoint to get document history by document ID
app.get('/history/:documentId', async (req, res) => {
    const documentId = req.params.documentId;
    const { from } = req.query;
  
    const role = await getRole(from);
    if (role !== BigInt(roles.Admin) && role !== BigInt(roles.Lawyer) && role !== BigInt(roles.Client)) {
      return res.status(403).json({ msg: 'Unauthorized: Only admin, lawyer, or client can retrieve document history' });
    }
  
    try {
      const history = await DocumentStorage.methods.getDocumentHistory(documentId).call();

      const formattedHistory = history.map(item => ({
        version: item.version,
        timestamp: item.timestamp.toString(),
        action: actions[item.action],
        hash: item.documentHash.toString(),
        address: item.user.toString()
      }))

      res.status(200).json({ documentId, formattedHistory });
    } catch (error) {
      console.error('Error retrieving document history:', error);
      res.status(500).json({ msg: 'Error retrieving document history', error: error.message });
    }
  });
  
  app.get('/all-document-histories', async (req, res) => {
  //const { from } = req.query;
  from ="0x42bdEea07713BC211D6C0978cD8600CEaa9963aC"

  try {
    const role = await getRole(from);
    if (role !== BigInt(roles.Admin)) {
      return res.status(403).json({ msg: 'Unauthorized: Only admin can retrieve all document histories' });
    }

    const result = await DocumentStorage.methods.getAllDocumentHistories().call({ from });

    const documentIds = result[0];
    const histories = result[1].map(history => history.map(item => ({
      version: item.version,
      timestamp: new Date(item.timestamp * 1000).toLocaleString(),
      action: actions[item.action],
      hash: item.documentHash,
      address: item.user
    })));

    res.status(200).json({ documentIds, histories });
  } catch (error) {
    console.error('Error retrieving all document histories:', error);
    res.status(500).json({ msg: 'Error retrieving all document histories', error: error.message });
  }
});

app.get('/all-user-files', async (req, res) => {
  try {
    const from = '0x42bdEea07713BC211D6C0978cD8600CEaa9963aC';
    const role = await getRole(from);
    if (role !== BigInt(roles.Admin)) {
      return res.status(403).json({ msg: 'Unauthorized: Only admin can retrieve all users files' });
    }

    const result = await DocumentStorage.methods.getAllUserFiles().call({ from });
    const users = result[0];
    const files = result[1];

    const userFiles = users.map((user, index) => ({
      user,
      documentIds: files[index]
    }));
    console.log(userFiles)

    res.status(200).json(userFiles);
  } catch (error) {
    console.error('Error retrieving all users files:', error);
    res.status(500).json({ msg: 'Error retrieving all users files', error: error.message });
  }
});

// Admin login endpoint
app.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hardcoded admin credentials
    const hardcodedUsername = 'admin';
    const hardcodedPassword = 'admin';

    // Check if provided credentials match the hardcoded ones
    if (username !== hardcodedUsername || password !== hardcodedPassword) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }


    res.status(200).json({
      user: {
        email: hardcodedUsername,
        role: 'Admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/backup', async (req, res) => {
  try {
    const from = '0x42bdEea07713BC211D6C0978cD8600CEaa9963aC';
    const role = await getRole(from);

    if (role !== BigInt(roles.Admin)) {
      return res.status(403).json({ msg: 'Unauthorized: Only admin can perform backup' });
    }

    const result = await DocumentStorage.methods.getAllDocumentHashes().call({ from });
    const documentIds = result[0];
    const documentHashes = result[1];

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    const output = fs.createWriteStream('backup.zip');

    archive.pipe(output);

    for (const hash of documentHashes) {
      const fileContent = await retrieveFromIPFS(hash);
      archive.append(fileContent, { name: `${hash}.pdf` }); // Corrected formatting here
    }

    await archive.finalize();

    output.on('close', () => {
      console.log('Backup.zip created');

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const fileMetadata = {
        name: 'backup.zip',
        parents: ['1xJZqi1eXihnmURLcyyQC9FxKcTG1Q59j']
      };
      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream('backup.zip')
      };
      drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      }, (err, file) => {
        if (err) {
          console.error('Error uploading file to Google Drive:', err);
          return res.status(500).json({ msg: 'Error uploading file to Google Drive', error: err.message });
        } else {
          console.log('File uploaded to Google Drive, File ID:', file.data.id);
          res.status(200).json({ msg: 'Backup created and uploaded to Google Drive successfully!', fileId: file.data.id });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});


app.post('/drive-to-ipfs', async (req, res) => {
  const folderId = "1jnWvvWcIbAABsObt6Ua6bxHJ_6biNGJH";
  const from = "0x42bdEea07713BC211D6C0978cD8600CEaa9963aC";

  try {
    const role = await getRole(from);
    if (role !== BigInt(roles.Admin)) {
      return res.status(403).json({ msg: 'Unauthorized: Only admin can perform this action' });
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const listFiles = async (folderId) => {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf'`,
        fields: 'files(id, name)',
      });
      return res.data.files;
    };

    const downloadFile = async (fileId) => {
      const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
      return Buffer.from(res.data);
    };

    const files = await listFiles(folderId);

    for (const file of files) {
      const fileBuffer = await downloadFile(file.id);

      const user = await User.findOne({ ethereumAddress: from });
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      const documentHash = generateHash(fileBuffer);
      //const { key, encryptedData } = encryptDocumentWithKey(fileBuffer, user.fernetKey);

      const ipfsHash = await uploadToIPFS(Buffer.from(fileBuffer, 'utf8'));

      const storedHash = await storeDocumentHash(file.name, ipfsHash, from);

      //console.log(File ${file.name} uploaded to IPFS with hash ${ipfsHash});
    }

    res.status(200).json({ msg: 'All files uploaded to IPFS and hashes stored in blockchain!' });
  } catch (error) {
    console.error('Error uploading files to IPFS:', error);
    res.status(500).json({ msg: 'Error uploading files to IPFS', error: error.message });
  }
});
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  console.log(code);
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Authentication successful! You can close this tab.');
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.status(500).send('Error retrieving access token');
  }
});



app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
  (async () => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const { default: open } = await import('open');
    open(authUrl);
  })();
});