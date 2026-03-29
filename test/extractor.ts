export function extractBookData(doc: Document) {
  const title = doc.querySelector('h1')?.textContent || 'No Title';
  const author = doc.querySelector('.author')?.textContent || 'Unknown';
  const summary = doc.querySelector('.summary')?.textContent || 'No Summary';

  return { title, author, summary };
}