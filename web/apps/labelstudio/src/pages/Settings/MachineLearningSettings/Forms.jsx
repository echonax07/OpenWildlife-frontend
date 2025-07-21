import { useState, useCallback, useEffect } from "react";
import { Button } from "../../../components";
import { ErrorWrapper } from "../../../components/Error/Error";
import { InlineError } from "../../../components/Error/InlineError";
import { Form, Input, Counter, Label, Toggle, Select, TextArea } from "../../../components/Form";
import { useAPI } from "../../../providers/ApiProvider";
import "./MachineLearningSettings.scss";

const CustomBackendForm = ({ action, backend, project, onSubmit }) => {
  const [selectedAuthMethod, setAuthMethod] = useState("");
  const [url, setUrl] = useState(backend?.url || "");
  const [settings, setSettings] = useState([]);
  const [, setMLError] = useState();
  const api = useAPI();

  const fetchSettings = useCallback(async () => {
    console.log("Fetching settings for backend:", backend);
    const response = await api.callApi("modelExtraParams", {
      params: {
        pk: backend.id
      }
    });

    if (response && response.extra_params && response.extra_params["configurableSettings"]) {
      setSettings(response.extra_params["configurableSettings"]);
    }
  }, [backend, setSettings]);

  useEffect(() => {
    fetchSettings();
  }, [backend]);

  const renderAllModelSettings = useCallback(() => {
    let extraParams = backend?.extra_params;

    let settingsToRender = [];
    for (let setting of settings) {
      let settingName = setting.name;
      const defaultValue = extraParams[settingName] ?? setting.default;

      settingName = "x_" + settingName; // Prefix with 'x_' to avoid name conflicts & make it easy to identify "extra_params"
      let settingElem = null;
            
      switch (setting.type) {
        case "boolean":
          settingElem = (
            <Toggle
              key={settingName}
              name={settingName}
              label={setting.label}
              labelProps={{description: setting.description}}
              defaultChecked={defaultValue}
            />
          );
          break;
        case "dropdown":
          settingElem = (
            <Select
              key={settingName}
              name={settingName}
              label={setting.label}
              labelProps={{description: setting.description}}
              options={setting.options}
              value={defaultValue}
            />
          );
          break;
        case "text":
          settingElem = (
            <Input
              key={settingName}
              name={settingName}
              label={setting.label}
              labelProps={{description: setting.description}}
              defaultValue={defaultValue}
            />
          );
          break;
        case "float":
          settingElem = (
            <Input
              key={settingName}
              type="number"
              name={settingName}
              label={setting.label}
              labelProps={{description: setting.description}}
              defaultValue={defaultValue}
            />
          );
          break;
        case "integer":
          settingElem = (
            <Counter
              key={settingName}
              name={settingName}
              label={setting.label}
              labelProps={{description: setting.description}}
              min={setting.min ?? Number.NEGATIVE_INFINITY}
              max={setting.max ?? Number.POSITIVE_INFINITY}
              value={defaultValue}
            />
          );
          break;
        default:
          console.warn(`Unknown setting type: ${setting.type} for setting: ${settingName}`);
          break;
      }

      // Wrap the setting in a Form.Row
      if (settingElem) {
        settingsToRender.push(
          <Form.Row key={settingName} columnCount={1}>
            {settingElem}
          </Form.Row>
        );
      }
    }

    return (
      <div>
        <Label text="Extra Model Parameters" large />
        {settingsToRender}
      </div>
    )
      
  }, [settings, backend]);

  return (
    <Form
      action={action}
      formData={{ ...(backend ?? {}) }}
      params={{ pk: backend?.id }}
      onSubmit={async (response) => {
        if (!response.error_message) {
          onSubmit(response);
        }
      }}
      prepareData={(data) => {
        data["extra_params"] = {};
        for (const key in data) {
          if (key.startsWith("x_")) {
            // Remove the 'x_' prefix from the key
            const newKey = key.slice(2);
            // Move the key-value pair to the extra_params object
            data["extra_params"][newKey] = data[key];
            // Remove the original key from the main data object
            delete data[key];
          }
        }
        console.log("Prepared data for ML backend:", data);
        return data;
      }}
    >
      <Input type="hidden" name="project" value={project.id} />

      <Form.Row columnCount={1}>
        <Input name="title" label="Name" placeholder="Enter a name" required />
      </Form.Row>

      <Form.Row columnCount={1}>
        <Input
          name="url"
          label="Backend URL"
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            fetchSettings();
          }}
          required />
      </Form.Row>

      <Form.Row columnCount={2}>
        <Select
          name="auth_method"
          label="Select authentication method"
          options={[
            { label: "No Authentication", value: "NONE" },
            { label: "Basic Authentication", value: "BASIC_AUTH" },
          ]}
          onChange={(e) => {
            setAuthMethod(e.target.value);
          }}
        />
      </Form.Row>

      {(backend?.auth_method === "BASIC_AUTH" || selectedAuthMethod === "BASIC_AUTH") && (
        <Form.Row columnCount={2}>
          <Input name="basic_auth_user" label="Basic auth user" />
          {backend?.basic_auth_pass_is_set ? (
            <Input name="basic_auth_pass" label="Basic auth pass" type="password" placeholder="********" />
          ) : (
            <Input name="basic_auth_pass" label="Basic auth pass" type="password" />
          )}
        </Form.Row>
      )}

      <Form.Row columnCount={1}>
        <Toggle
          name="is_interactive"
          label="Interactive preannotations"
          description="If enabled some labeling tools will send requests to the ML Backend interactively during the annotation process."
        />
      </Form.Row>

      <Form.Row columnCount={1}>
        <div>
          {url === backend?.url && renderAllModelSettings()}
        </div>
      </Form.Row>

      <Form.Actions>
        <Button type="submit" look="primary" onClick={() => setMLError(null)}>
          Validate and Save
        </Button>
      </Form.Actions>

      <Form.ResponseParser>
        {(response) => (
          <>
            {response.error_message && (
              <ErrorWrapper
                error={{
                  response: {
                    detail: `Failed to ${backend ? "save" : "add new"} ML backend.`,
                    exc_info: response.error_message,
                  },
                }}
              />
            )}
          </>
        )}
      </Form.ResponseParser>

      <InlineError />
    </Form>
  );
};

export { CustomBackendForm };
