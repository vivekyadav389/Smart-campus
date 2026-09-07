const fs = require('fs');
const file = '/Users/apple/Desktop/Smart Campuss/Smart-campus/frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const hookToAdd = `
    useEffect(() => {
        const fetchAvailableSemesters = async () => {
            if (user?.branch) {
                // Fetch all semesters for the teacher's branch
                const activeData = await getSemesters(user.branch, 'All');
                const historyData = await getSemesterHistory(user.branch, 'All');
                // Combine them and remove duplicates by ID
                const allSemesters = [...activeData, ...historyData];
                const uniqueSems = Array.from(new Map(allSemesters.map(item => [item.id, item])).values());
                setAvailableExportSemesters(uniqueSems);
            }
        };
        fetchAvailableSemesters();
    }, [user]);
`;

content = content.replace(
    /const \[availableExportSemesters, setAvailableExportSemesters\] = useState\(\[\]\);/,
    `const [availableExportSemesters, setAvailableExportSemesters] = useState([]);\n${hookToAdd}`
);

fs.writeFileSync(file, content);
console.log("Added fetchAvailableSemesters hook");
