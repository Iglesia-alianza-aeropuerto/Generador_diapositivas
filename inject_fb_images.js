const fs = require('fs');

const indexHtmlPath = 'index.html';
const image1Path = 'temp_fb_pptx/extracted/ppt/media/image1.png';
const image5Path = 'temp_fb_pptx/extracted/ppt/media/image5.png';

try {
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // Read images and convert to base64
  const image1Base64 = fs.readFileSync(image1Path).toString('base64');
  const image5Base64 = fs.readFileSync(image5Path).toString('base64');

  // Prepare strings to inject
  const injectionString = `
  // 🔥 FONDOS FORMATO FACEBOOK
  const intermedioFacebook = "data:image/png;base64,${image1Base64}";
  const plantillaFacebook = "data:image/png;base64,${image5Base64}";
`;

  // Find insertion point (after existing const intermedio)
  const insertionPointStr = 'const intermedio ="iVBORw';
  const insertionIndex = indexHtml.indexOf('<script>');

  if (insertionIndex !== -1) {
      // Inject after <script>
      const firstPart = indexHtml.slice(0, insertionIndex + 8);
      const secondPart = indexHtml.slice(insertionIndex + 8);
      
      const newHtml = firstPart + '\n' + injectionString + secondPart;
      fs.writeFileSync(indexHtmlPath, newHtml);
      console.log('Successfully injected base64 images.');
  } else {
      console.log('Could not find <script> tag insertion point.');
  }
} catch (e) {
  console.error("Error:", e);
}
