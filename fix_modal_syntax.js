const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/components/StudentDetailsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the return block that has `{student && (` with just the div
const search = `    return (
        {/* Detailed Student Modal */}
            {student && (
                <div style={{`;
const replace = `    return (
                <div style={{`;

content = content.replace(search, replace);

// Remove the closing `)}` at the end
const endSearch = `            )}
    );
};`;
const endReplace = `    );
};`;
content = content.replace(endSearch, endReplace);

fs.writeFileSync(file, content);
