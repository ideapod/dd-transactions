import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
const serverURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5050"




export default function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [fieldList, setFieldList] = useState([]);

  // This method fetches the records from the database.
  useEffect(() => {
    async function getTransactions() {
      console.log('getting transactions in transactions list');
      const response = await fetch(`${serverURL}/transaction/`);
      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        console.error(message);
        return;
      }
      const records = await response.json();
      console.log('fetched: ' + records.length + ' transactions');
      
      setTransactions(records);
    }
    
    // get the list of transactions
    getTransactions();
    console.log(transactions.length + " transactions loaded");
    // field list from thosse transactions.
    var alist = getFieldList(transactions);
    console.log(alist.length + " fields loaded");
    setFieldList(alist);
    
    return;
  }, [transactions.length]);

  // This method will delete a record
  async function deleteRecord(id) {
    await fetch(`${serverURL}/transaction/${id}`, {
      method: "DELETE",
    });
    const newRecords = transactions.filter((el) => el._id !== id);
    setTransactions(newRecords);
  }

  // work out the fields shared by transactions that can be used on the list of txns. 
  function getFieldList(txnList) {
    
    // get counts of each field name
    var fieldCounts = [];
    txnList.map( (transaction) => {
      console.log ('extracting fields from txn id: ' + transaction._id )
       Object.keys(transaction.data).map( (akey) => {
         console.log ('field is: ' + akey);
         if ( akey in fieldCounts) {
          fieldCounts[akey] += 1;
         } else{
           fieldCounts[akey] = 1;
         }
         
         console.log('fieldCount for ' + akey + ' = ' + fieldCounts[akey]);
      });
    });
    
    console.log("total fields from transactions: " + fieldCounts.length);
    
    // those fields that have a count sames as the record list are keepers
    var finalList = [];
    var key = "";
    for (key in fieldCounts) {
      if (fieldCounts[key] == transactions.length)
        finalList.push( key);
    }
    
    console.log("fields shared amongst all txns: " + finalList.length);
    
    return finalList;
  }

  // This method will map out the transactions on the table
  function recordList() {
    
    // get the list of shared properties.
    // map the txn data onto TxnRow components   
    return transactions.map((transaction) => {
      return (
        <TxnRow
          record={transaction}
          deleteRecord={() => deleteRecord(transaction._id)}
          key={transaction._id}
          fields={fieldList}
        />
      );
    });
  }
  
  const DataRowSnippet = (fields,transaction)  => {
       return fields.map( (fieldName) => {
         return(
         <td className="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
          { transaction.data[fieldName] }
        </td>);
       });
}


const TxnRow = (props) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
    { DataRowSnippet(props.fields, props.record) }
    <td className="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
          { props.record.name }
    </td>
    <td className="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
      <div className="flex gap-2">
        <Link
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          to={`/transactions/edit/${props.record._id}`}
        >
          Edit
        </Link>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 hover:text-accent-foreground h-9 rounded-md px-3"
          color="red"
          type="button"
          onClick={() => {
            props.deleteRecord(props.record._id);
          }}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);
  
  // generate a header row with the field list
  function HeaderRowSnippet(list) {
      console.log("fields to be put in header: " + list.length);
       return (list.map( (fieldName) => {
         return (
         <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
          { fieldName }
         </th>
        );
       }));
  }


  
  // This following section will display the table with the records of transactions.
  // use the column definitions we arrived at earlier
  return (
    <>
      <h3 className="text-lg font-semibold p-4">Transaction List</h3>
      <div className="border rounded-lg overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&amp;_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                { HeaderRowSnippet(fieldList) }
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
                  Transaction Type
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="[&amp;_tr:last-child]:border-0">
              {recordList()}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}