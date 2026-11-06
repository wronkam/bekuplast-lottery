# Brand font

`brand-font.woff2` is the font used by the **bekuplast** themes under the CSS family name `"Brand Font"`.
It is currently **Manrope** (variable, weights 200–800, full Polish & German character set),
licensed under the SIL Open Font License (`OFL-Manrope.txt`). It is bundled so the page works offline.

## Drop-in replacement
- **Have a WOFF2?** Replace `brand-font.woff2` with your file (same name). Done.
- **Have a TTF or OTF?** Delete `brand-font.woff2` and put your file here as `brand-font.ttf` or `brand-font.otf`.
  The `@font-face` rule in `css/styles.css` tries `.woff2`, then `.ttf`, then `.otf`.
- A single-weight font works too. Bold text is then synthesised by the browser.
  For best results use a variable font or one that covers weights 400–800.
- Make sure the font contains Polish (ą ć ę ł ń ó ś ź ż) and German (ä ö ü ß) characters.

Themes opt in with `--font: "Brand Font", <fallbacks>;` in their `theme.css`.
