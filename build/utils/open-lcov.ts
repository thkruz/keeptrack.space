import opener from 'opener';
import path from 'path';

const __dirname = path.resolve(path.dirname(''));
const filePath = path.join(__dirname, '/coverage/lcov-report/index.html');

console.log(filePath);
opener(filePath);
