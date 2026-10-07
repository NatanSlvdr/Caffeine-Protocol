/** A no-break space, and the narrow one French sets before ; ? and !. */
const NBSP = String.fromCharCode(0xa0);
const NARROW_NBSP = String.fromCharCode(0x202f);

/**
 * French typography: no line ever starts with a colon, a closing guillemet, a semicolon, a ? or !, or a percent sign,
 * and “n°” stays with its number.
 */
export const typeset = (text: string): string =>
  text
    .replace(/([Nn]°) /g, `$1${NBSP}`)
    .replace(/ ([:»%])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ ([;?!])/g, `${NARROW_NBSP}$1`);
