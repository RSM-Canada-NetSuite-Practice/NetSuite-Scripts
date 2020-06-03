// sample code that simply passes on what has been exported
  function preSavePageFunction (options) {
    var journal = [];
    var output = [];
    for(var i=0; i<options.data.length;i++)
  {
      var journallines = {};
      var journalObj = options.data[i];
      var substr = journalObj['Account'].substring(0,1);
      
      journallines.Account = journalObj.Account
      journallines.Memo  = journalObj['Account Description']

    if (journalObj.Account) {

    }
      journallines.Credit = journalObj['Amount'] < 0 ? journalObj['Amount'] * -1 : ''
      journallines.Debit = journalObj['Amount'] > 0 ? Number(journalObj['Amount']) : ''
      journal.push(journallines)
  }
    if (options.data.length) {
    output.push(
      {
        journal
      })
    }
  return {
    data: output,
    errors: options.errors
  }
}
