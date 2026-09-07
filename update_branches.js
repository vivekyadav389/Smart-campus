const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /setAllStudentsData\(mappedStudents\);/,
    `setAllStudentsData(mappedStudents);
                
                const bSet = new Set(availableBatches);
                const brSet = new Set(availableBranches);
                studentUsers.forEach(stu => {
                    if (stu.batch) bSet.add(stu.batch);
                    if (stu.branch) brSet.add(stu.branch);
                });
                setAvailableBatches([...bSet]);
                setAvailableBranches([...brSet]);`
);

fs.writeFileSync(file, content);
console.log("Updated batches logic");
