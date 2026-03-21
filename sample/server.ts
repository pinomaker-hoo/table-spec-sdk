import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import { renderTableView, renderERD } from '../src/index';
import { sampleTables } from './sample-data';

const app = express();
const PORT = 3333;

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: false,
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname));

app.get('/', (_req, res) => {
  const tableHTML = renderTableView(sampleTables);
  const erdHTML = renderERD(sampleTables);

  res.render('sample', {
    title: 'Table Spec SDK - Sample',
    tableHTML,
    erdHTML,
    tableCount: sampleTables.length,
  });
});

app.listen(PORT, () => {
  console.log(`Sample server running at http://localhost:${PORT}`);
});
