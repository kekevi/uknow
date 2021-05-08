/*
    Blocks are the "building blocks" of notes. A block consists of a
    body text and are categorized as either being notes, style, and type.

    List of Block Types:
    - paragraph - string 
*/ 

/**
 * @param type a string categorizing whether the block is an event, a bullet group, paragraph, etc.
 */
class Block {
    constructor (type, header, body, order) {
        this.type = type;
        this.header = header;
        this.body = body;
        this.order = order;
    }
}