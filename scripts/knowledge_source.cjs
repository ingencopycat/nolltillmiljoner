// Build-time adapter. scripts/ and docs/ never enter the production staging folder.
module.exports=require('../knowledge-core.js').create(require('../docs/internal/knowledge/catalog.cjs'));
