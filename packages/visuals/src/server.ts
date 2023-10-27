// Start up a simple express app to serve from 'static'
import express from 'express';

const app = express();
app.use(express.static('./static'));
app.listen(3000, () => console.log('Example app listening on http://localhost:3000'));
