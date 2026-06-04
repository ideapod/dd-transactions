import * as React from "react";
import * as ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import App from "./App";
import Record from "./components/Record";
import RecordList from "./components/RecordList";
import TransactionList from "./components/TransactionList";
import TransactionForm from "./components/TransactionForm";
import TxnDefList from "./components/TxnDefList";
import TxnDefForm from "./components/TxnDefForm";

import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <RecordList />,
      },
    ],
  },
  {
    path: "/edit/:id",
    element: <App />,
    children: [
      {
        path: "/edit/:id",
        element: <Record />,
      },
    ],
  },
  {
    path: "/create",
    element: <App />,
    children: [
      {
        path: "/create",
        element: <Record />,
      },
    ],
  },
  {
    path: "/transactions",
    element: <App />,
    children: [
      {
        path: "/transactions",
        element: <TransactionList />,
      },
      {
        path: "/transactions/edit/:id",
        element: <TransactionForm />,
      },
      {
        path: "/transactions/create/:txndefid",
        element: <TransactionForm />,
      },
    ],
  },
  {
    path: "/txndefs",
    element: <App />,
    children: [ 
      {
        path: "/txndefs",
        element: <TxnDefList />,
      },
      {
        path: "/txndefs/edit/:id",
        element: <TxnDefForm />,
      },
      {
        path: "/txndefs/create",
        element: <TxnDefForm />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);