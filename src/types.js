// @ts-check

/**
 * @typedef {{ chapter:number, verse:number, string?:string, title?:string }} VerseEntry
 */

/**
 * @typedef {{ text:string, format?:string }} VerseText
 */

/**
 * @typedef {{
 *   shortcode:string,
 *   title:string,
 *   description:string,
 *   short_title?:string,
 *   sample?:Object.<string, VerseText>,
 *   audio?:number,
 *   image?:string,
 *   year?:number,
 *   label?:string,
 *   name?:string
 * }} MetaEntry
 */

/**
 * @typedef {{
 *   index:Object.<string, VerseEntry>,
 *   structures:Object.<string, any[]>,
 *   structureIndex:Object.<string, Object.<string, number|string>>,
 *   outlines:Object.<string, any[]>,
 *   outlineIndex:Object.<string, Object.<string, number|string>>,
 *   meta:{
 *     structure:Object.<string, MetaEntry>,
 *     outline:Object.<string, MetaEntry>,
 *     version:Object.<string, MetaEntry>,
 *     commentary:Object.<string, MetaEntry>,
 *     audiocom:Object.<string, MetaEntry>
 *   },
 *   text:Object.<string, Object.<string, VerseText>>,
 *   tags:any,
 *   commentary:any,
 *   commentary_audio:any,
 *   app?:any,
 *   hebrew?:any,
 *   custom?:any,
 *   timeouts:Object.<string, ReturnType<typeof setTimeout>[]>
 * }} IsaiahData
 */

export {};
