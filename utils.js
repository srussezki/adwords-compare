
module.exports =  {
  printInBox : function (txt) {
    var msg = '| ' + txt + ' |',
        line = '-'.repeat(msg.length);
    console.log( '\t' + line );
    console.log( '\t' + msg );
    console.log( '\t' + line );
  }
}
