# Niyati Sur Portfolio

This is a plain HTML/CSS/JavaScript portfolio, so you can edit it without React, npm, or any build tools.

## Open it
Double-click `index.html`.

For the cleanest local preview, open the folder in VS Code and use the Live Server extension if you have it.

## The easiest things to edit

### Contact links
Open `content.js` and replace:
- `your-email@example.com`
- `https://www.linkedin.com/in/your-linkedin/`

### Project text
Open `index.html` and search for:
- `SAE AERO`
- `TIME-BLINDNESS WATCH`
- `EEG + RASPBERRY PI`

Everything is written directly in the HTML so it is easy to change.

### Colors
Open `styles.css` and edit the variables at the very top:
- `--violet`
- `--paper`
- `--ink`
- `--acid`

### Fonts
The site uses free Google Fonts:
- Archivo Narrow for the condensed display type
- Inter for body copy

These are intentionally not Zipline's proprietary fonts.

## Add your own project photos later
Each project currently has a custom CSS illustration so the site looks finished even without photos.
If you want real images, place them in an `images` folder and replace a `.project-visual` block with an `<img>` tag.

Example:
```html
<div class="project-visual">
  <img src="images/sae-payload.jpg" alt="SAE Aero autonomous payload" style="width:100%;height:100%;object-fit:cover;">
</div>
```

## Deploy for free
Easy options:
- GitHub Pages
- Netlify
- Vercel

Because this is a static site, all three work without any framework setup.
