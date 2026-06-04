import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JSONInput from 'react-json-editor-ajrm'
import locale from 'react-json-editor-ajrm/locale/en';
    
const serverURL = "http://52.62.121.255:8080"

export default function TxnDefForm() {
  const [form, setForm] = useState({
    name: "",
    version: "",
    schema: "",
  });
  const [isNew, setIsNew] = useState(true);
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      const id = params.id?.toString() || undefined;
      if(!id) return;
      setIsNew(false);
      const response = await fetch(
        `${serverURL}/txndef/${params.id.toString()}`
      );
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        console.error(message);
        return;
      }
      const txndef = await response.json();
      if (!txndef) {
        console.warn(`txndef with id ${id} not found`);
        navigate("/txndefs");
        return;
      }
      
      console.log('loaded data - schema is:' + JSON.stringify(txndef.schema));
      setForm(txndef);
    }
    fetchData();
    return;
  }, [params.id, navigate]);

  // These methods will update the state properties.
  function updateForm(value) {
    console.log ("updating form: " + JSON.stringify(value));
    
    return setForm((prev) => {
      return { ...prev, ...value };
    });
  }
  
  // specific updater for the value from the form. want to take a look on the way through.
  function updateFormSchema(value) {
    
    if (!value) { 
      console.log ('schema value is invalid. cant update form' );
      return;
    } 
    console.log ("updating form schema: " + JSON.stringify(value));
    const updateThis = { schema: value.schema };
    
    return setForm((prev) => {
      return { ...prev, ...updateThis };
    });
  }

  // This function will handle the submission.
  async function onSubmit(e) {
    e.preventDefault();
    const txndef = { ...form };
    console.log ('form fields are: ' + JSON.stringify(form));
    if (!txndef.schema) txndef.schema = form.schema_editor.state()['jsObject'];
    
    console.log('schema on submit is: ' + JSON.stringify(txndef.schema));
    try {
      let response;
      if (isNew) {
        // if we are adding a new txndef we will POST to /txndef.
        console.log("Posting new txndef: " + txndef.Name);
        response = await fetch(`${serverURL}/txndef`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(txndef),
        });
      } else {
        // if we are updating a txndef we will PATCH to /txndef/:id.
        console.log("updating transaction def" + txndef._id);
        response = await fetch(`${serverURL}/txndef/${params.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(txndef),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('A problem occurred with your fetch operation: ', error);
    } finally {
      setForm({ name: "", version: "", schema: "" });
      navigate("/txndefs");
    }
  }

  // This following section will display the form that takes the input from the user.
  return (
    <>
      <h3 className="text-lg font-semibold p-4">Create/Update Transaction Definition</h3>
      <form
        onSubmit={onSubmit}
        className="border rounded-lg overflow-hidden p-4"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-slate-900/10 pb-12 md:grid-cols-2">
          <div>
            <h2 className="text-base font-semibold leading-7 text-slate-900">
              Transaction Info
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Update the schema so you can change the data collected
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 ">
            <div className="sm:col-span-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium leading-6 text-slate-900"
              >
                Name
              </label>
              <div className="mt-2">
                <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6"
                    placeholder="First Last"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="sm:col-span-4">
              <label
                htmlFor="position"
                className="block text-sm font-medium leading-6 text-slate-900"
              >
                Version
              </label>
              <div className="mt-2">
                <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                  <input
                    type="text"
                    name="version"
                    id="version"
                    className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6"
                    placeholder="1.0"
                    value={form.version}
                    onChange={(e) => updateForm({ version: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="schema"
                className="block text-sm font-medium leading-6 text-slate-900"
              >
                Schema
              </label>
 
              <div className="mt-2">
                <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                  <JSONInput 
                      id          = 'schema_editor'
                      // placeholder = { (form.schema.length > 0)?JSON.parse(form.schema): undefined }
                      placeholder = { form.schema ? form.schema : undefined }
                      // colors      = { darktheme }
                      locale      = { locale }
                      height      = '550px'
                      onKeyPressUpdate = { true }
                      onChange={(data) => updateFormSchema({ schema: data.jsObject })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <input
          type="submit"
          value="Save Transaction Definition"
          className="inline-flex items-center justify-center whitespace-nowrap text-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 hover:text-accent-foreground h-9 rounded-md px-3 cursor-pointer mt-4"
        />
      </form>
    </>
  );
}