const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('ModalErrorBoundary')) {
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport ModalErrorBoundary from './ModalErrorBoundary';"
    );
    
    // Rename old component
    content = content.replace("const StudentDetailsModal = ({ student, onClose }) => {", "const StudentDetailsModalInner = ({ student, onClose }) => {");
    
    // Add wrapper at the end
    content = content.replace("export default StudentDetailsModal;", 
`const StudentDetailsModal = (props) => (
  <ModalErrorBoundary onClose={props.onClose}>
    <StudentDetailsModalInner {...props} />
  </ModalErrorBoundary>
);

export default StudentDetailsModal;`);
    
    fs.writeFileSync(file, content);
    console.log("Added Error Boundary");
}
