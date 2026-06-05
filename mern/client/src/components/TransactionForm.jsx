import React from 'react';
import { useState, useEffect } from "react";
import FormRenderer from '@data-driven-forms/react-form-renderer/form-renderer';
import { componentMapper, FormTemplate } from '@data-driven-forms/mui-component-mapper';
import { useParams, useNavigate } from "react-router-dom";
// import { schema } from './schema.js'
// import { getSchemaFromMongo } from './dochelper.js'
const helloWorldID = '6632d8b205d0dc086767d37b';
const serverURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5050"

const defaultSchema = {
    fields: [{
        component: 'text-field',
        name: 'first name',
        label: 'first name (Default)',
        isRequired: true,
        validate: [{ type: 'required' }]
      }, 
      {
        component: 'text-field',
        name: 'last name',
        label: 'Last name',
        isRequired: true,
        validate: [{ type: 'required' }]
      },
      {
        component: 'text-field',
        name: 'email',
        label: 'Email',
        isRequired: true,
        validate: [
          { type: 'required' },
          {
            type: 'pattern',
            pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,}$',
            message: 'Not valid email'
          }
        ]
      },{
        component: 'text-field',
        name: 'confirm-email',
        label: 'Confirm email',
        type: 'email',
        isRequired: true,
        validate: [{ type: 'same-email' }]
      },{
        component: 'checkbox',
        name: 'newsletters',
        label: 'I want to receive newsletter'
      }]
  };

const FormTemplateCanReset = (props) => <FormTemplate {...props} canReset />;
var formName = 'Get Started Form';
const validatorMapper = {
  'same-email': () => (
    value, allValues
    ) => (
      value !== allValues.email ?
        'Email does not match' :
        undefined
    )
}

// const  newschema =  getSchemaFromMongo() ;

function TransactionForm() {
  const navigate = useNavigate();
  const params = useParams();
  const [isNew, setIsNew] = useState(true);
  const [txnDefId, settxnDefId] = useState(params.txndefid?.toString() || helloWorldID);
  const [txndef, setTxnDef] = useState({
    name: "",
    version: "",
    schema: "",
  });
  
  const [txndata, setTxnData] = useState({
      schema_id: "",
      name: "",
      created: "",
      modified: "",
      data: "",
  });
  
  
  
  useEffect(() => {
    async function fetchData(url) {
      const response = await fetch( url );
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        console.error(message);
        return;
      }
      const data = await response.json();
      return data;
    }
    
    async function fetchTxnDef( defid ) {
      const fetchURL = `${serverURL}/txndef/${defid}`
      
      console.log('retrieving txn def id:' + defid);
      var data = await fetchData(fetchURL);
      if (!data) {
        console.warn(`Record with id ${defid} not found`);
        return
      }
      
      return data;
    }
    
    async function fetchTxnData( txnid) {
      const fetchURL = `${serverURL}/transaction/${txnid}`
      
      console.log('retrieving txn id:' + txnid);
      var data = await fetchData(fetchURL);
      if (!data) {
        console.warn(`Record with id ${txnid} not found`);
        return;
      }
      
      return data;
    }
    
    async function loadData() {
      
      const txnid = params.id?.toString();
      var defid = "";
      var txnreqdata = "";
      
      // if there's a transaction id - load it for data and schema. 
      if (txnid) {
        setIsNew(false);
        txnreqdata = await fetchTxnData(txnid);
        if (!txnreqdata) {
          console.log ('no form data available for that id');
          navigate("/");  
          return;
        }
        
        
        
        // hold onto the schema definition id. 
        defid =  txnreqdata.schema_id || helloWorldID;
        console.log("transaction data loaded, def id: " + defid);
        
      } else {
        // we should get told the def id to use. 
        defid = params.txndefid?.toString() || helloWorldID;
      }
        
      // if there's no schema by now, then we can't show anything.
      if(!defid) {
        console.log("no transaction definition avialable");
        navigate("/");
        return;
      }
      
      const data = await fetchTxnDef(defid);
      if (!data) {
        console.log ('no form definition available');
        navigate("/");
        return;
      }
      
      console.log('fetched transaction definition');
      
      settxnDefId(defid);
      
      // we have definition
      setTxnDef(data);
      
      // we have the form data
      setTxnData(txnreqdata);
    }
    
    loadData();
    return;
  }, [params.txndefid, params.txnid, navigate]);
  
  const schema = txndef.schema || defaultSchema;
  formName = txndef.name || 'Get started form 2';
  
  // Returns the payment step from the schema if one exists, otherwise null.
  function getPaymentStep() {
    const wizardField = txndef.schema?.fields?.find((f) => f.component === "wizard");
    return wizardField?.fields?.find((s) => s.type === "payment") || null;
  }

  async function onSubmit(values) {
    const paymentStep = getPaymentStep();

    // --- paid submission: redirect to Stripe Checkout ---
    if (isNew && paymentStep) {
      try {
        const response = await fetch(`${serverURL}/payment/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txnDefId, formData: values }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const { url } = await response.json();
        window.location.href = url;
      } catch (error) {
        console.error("Error creating checkout session:", error);
      }
      return;
    }

    // --- free or edit submission: save directly ---
    const txn = {
      schema_id: txnDefId,
      name: txndef.name,
      created: Date.now(),
      modified: Date.now(),
      data: values,
      status: "free",
    };

    try {
      let response;
      if (isNew) {
        console.log("Posting new transaction: " + txn.name);
        response = await fetch(`${serverURL}/transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(txn),
        });
      } else {
        console.log("Updating transaction: " + txn.name + " id:" + params.id);
        response = await fetch(`${serverURL}/transaction/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(txn),
        });
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      console.error("A problem occurred with your fetch operation:", error);
    } finally {
      navigate("/transactions");
    }
  }
  
  
  return (
    <div style={{ maxWidth: 640, padding: '24px 0' }}>
      <FormRenderer
        componentMapper={componentMapper}
        FormTemplate={FormTemplateCanReset}
        schema={schema}
        onSubmit={onSubmit}
        onCancel={() => navigate("/transactions")}
        initialValues={txndata.data}
        validatorMapper={validatorMapper}
      />
    </div>
  )
}
  
/*
const GetStartedForm = () => (
  
  
  <Grid spacing={4} container>
    <FormRenderer
      componentMapper={componentMapper}
      FormTemplate={FormTemplateCanReset}
      // schema={newschema || schema}
      schema={schema}
      onSubmit={console.log}
      onCancel={() => navigate("/")}
      validatorMapper={validatorMapper}
    />
  </Grid>
); */

// GetStartedForm.displayName = 'Get started form';
TransactionForm.displayName = formName;
export default TransactionForm;