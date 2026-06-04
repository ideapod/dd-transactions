import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
const serverURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5050"

const TxnDefRow = (props) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
    <td className="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
      {props.record.name}
    </td>
    <td className="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
      {props.record.version}
    </td>
    <td className="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
      <div className="flex gap-2">
        <Link
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          to={`/txndefs/edit/${props.record._id}`}
        >
          Edit
        </Link>
        <Link
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          to={`/transactions/create/${props.record._id}`}
        >
          Create Transaction
        </Link>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 hover:text-accent-foreground h-9 rounded-md px-3"
          color="red"
          type="button"
          onClick={() => {
            props.deleteTxnDef(props.record._id);
          }}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);

export default function RecordList() {
  const [txndefs, setTxnDefs] = useState([]);

  // This method fetches the records from the database.
  useEffect(() => {
    async function getTxnDefs() {
      console.log('getting txnDefs in list');
      const response = await fetch(`${serverURL}/txndef/`);
      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        console.error(message);
        return;
      }
      const txndefs = await response.json();
      setTxnDefs(txndefs);
    }
    getTxnDefs();
    return;
  }, [txndefs.length]);

  // This method will delete a record
  async function deleteTxnDef(id) {
    await fetch(`${serverURL}/txndef/${id}`, {
      method: "DELETE",
    });
    const newTxnDefs = txnDefs.filter((el) => el._id !== id);
    setTxnDefs(newTxnDefs);
  }

  // This method will map out the records on the table
  function txnDefList() {
    return txndefs.map((txndef) => {
      return (
        <TxnDefRow
          record={txndef}
          deleteRecord={() => deleteTxnDef(record._id)}
          key={txndef._id}
        />
      );
    });
  }

  // This following section will display the table with the records of individuals.
  return (
    <>
      <h3 className="text-lg font-semibold p-4">Employee Records</h3>
      <div className="border rounded-lg overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&amp;_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
                  Name
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
                  Version
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="[&amp;_tr:last-child]:border-0">
              {txnDefList()}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}