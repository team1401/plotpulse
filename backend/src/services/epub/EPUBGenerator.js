import archiver from 'archiver';
import { createWriteStream, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export class EPUBGenerator {
  constructor(novelModel, chapterModel) {
    this.novels = novelModel;
    this.chapters = chapterModel;
  }

  /**
   * Generate EPUB file
   * @param {string} novelId
   * @param {object} options - { author, coverImage, dedication, copyright }
   * @returns {Promise<Buffer>} EPUB file as buffer
   */
  async generate(novelId, options = {}) {
    const novel = this.novels.findById(novelId);
    if (!novel) throw new Error('Novel not found');

    const chapters = this.chapters.findByNovel(novelId)
      .filter(ch => ch.status === 'completed')
      .sort((a, b) => a.chapter_number - b.chapter_number);

    if (chapters.length === 0) {
      throw new Error('No completed chapters to export');
    }

    const {
      author = 'Unknown Author',
      coverImage = null,
      dedication = null,
      copyright = null
    } = options;

    // Create temporary directory
    const tempDir = join(tmpdir(), `epub-${uuidv4()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      // Create EPUB structure
      this.createMimetype(tempDir);
      this.createContainer(tempDir);
      this.createContent(tempDir, novel, chapters, author, dedication, copyright);
      
      if (coverImage) {
        this.addCoverImage(tempDir, coverImage);
      }

      // Archive to EPUB
      const epubBuffer = await this.createArchive(tempDir);
      
      return epubBuffer;
    } finally {
      // Cleanup
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  createMimetype(tempDir) {
    writeFileSync(join(tempDir, 'mimetype'), 'application/epub+zip');
  }

  createContainer(tempDir) {
    const metaInfDir = join(tempDir, 'META-INF');
    mkdirSync(metaInfDir, { recursive: true });

    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

    writeFileSync(join(metaInfDir, 'container.xml'), containerXml);
  }

  createContent(tempDir, novel, chapters, author, dedication, copyright) {
    const oebpsDir = join(tempDir, 'OEBPS');
    mkdirSync(oebpsDir, { recursive: true });

    const uuid = uuidv4();
    const timestamp = new Date().toISOString();

    // Create OPF file
    const manifest = [];
    const spine = [];

    // Add chapters
    chapters.forEach((chapter, idx) => {
      const filename = `chapter${idx + 1}.xhtml`;
      manifest.push(`<item id="chapter${idx + 1}" href="${filename}" media-type="application/xhtml+xml"/>`);
      spine.push(`<itemref idref="chapter${idx + 1}"/>`);
      
      const chapterHtml = this.createChapterHTML(chapter);
      writeFileSync(join(oebpsDir, filename), chapterHtml);
    });

    // Add front matter
    if (dedication) {
      manifest.unshift('<item id="dedication" href="dedication.xhtml" media-type="application/xhtml+xml"/>');
      spine.unshift('<itemref idref="dedication"/>');
      writeFileSync(join(oebpsDir, 'dedication.xhtml'), this.createDedicationHTML(dedication));
    }

    // Title page
    manifest.unshift('<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>');
    spine.unshift('<itemref idref="titlepage"/>');
    writeFileSync(join(oebpsDir, 'titlepage.xhtml'), this.createTitlePageHTML(novel.title, author));

    // TOC
    manifest.push('<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
    writeFileSync(join(oebpsDir, 'toc.xhtml'), this.createTOCHTML(novel.title, chapters));

    // OPF
    const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uuid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uuid">${uuid}</dc:identifier>
    <dc:title>${this.escapeXML(novel.title)}</dc:title>
    <dc:creator>${this.escapeXML(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>${timestamp}</dc:date>
    <meta property="dcterms:modified">${timestamp}</meta>
    ${copyright ? `<dc:rights>${this.escapeXML(copyright)}</dc:rights>` : ''}
  </metadata>
  <manifest>
    ${manifest.join('\n    ')}
  </manifest>
  <spine>
    ${spine.join('\n    ')}
  </spine>
</package>`;

    writeFileSync(join(oebpsDir, 'content.opf'), opf);
  }

  createChapterHTML(chapter) {
    const title = chapter.title || `Chapter ${chapter.chapter_number}`;
    const content = chapter.content
      .split('\n\n')
      .map(para => `    <p>${this.escapeXML(para.trim())}</p>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeXML(title)}</title>
  <style>
    body { font-family: serif; line-height: 1.6; margin: 2em; }
    h1 { text-align: center; margin: 2em 0; }
    p { text-indent: 1.5em; margin: 0; }
    p:first-of-type { text-indent: 0; }
  </style>
</head>
<body>
  <h1>${this.escapeXML(title)}</h1>
${content}
</body>
</html>`;
  }

  createTitlePageHTML(title, author) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Title Page</title>
  <style>
    body { text-align: center; margin: 0; padding: 0; }
    .title { font-size: 2.5em; margin: 3em 0 1em 0; font-weight: bold; }
    .author { font-size: 1.5em; margin: 2em 0; }
  </style>
</head>
<body>
  <div class="title">${this.escapeXML(title)}</div>
  <div class="author">by ${this.escapeXML(author)}</div>
</body>
</html>`;
  }

  createDedicationHTML(dedication) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Dedication</title>
  <style>
    body { text-align: center; margin: 5em 2em; font-style: italic; }
  </style>
</head>
<body>
  <p>${this.escapeXML(dedication)}</p>
</body>
</html>`;
  }

  createTOCHTML(title, chapters) {
    const items = chapters.map((ch, idx) => {
      const chTitle = ch.title || `Chapter ${ch.chapter_number}`;
      return `    <li><a href="chapter${idx + 1}.xhtml">${this.escapeXML(chTitle)}</a></li>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
  }

  async createArchive(tempDir) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const archive = archiver('zip', { 
        zlib: { level: 9 },
        store: true // mimetype must be stored uncompressed
      });

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add mimetype first (uncompressed)
      archive.file(join(tempDir, 'mimetype'), { 
        name: 'mimetype',
        store: true 
      });

      // Add rest
      archive.directory(join(tempDir, 'META-INF'), 'META-INF');
      archive.directory(join(tempDir, 'OEBPS'), 'OEBPS');

      archive.finalize();
    });
  }

  addCoverImage(tempDir, coverImagePath) {
    // TODO: Implement cover image support
    // Would need to copy image, add to manifest, create cover page
  }

  escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
