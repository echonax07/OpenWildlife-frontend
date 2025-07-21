import { useCallback, useContext, useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Button, Spinner } from "../../../components";
import { Description } from "../../../components/Description/Description";
import { Form, Input, Counter, Label, Toggle, Select } from "../../../components/Form";
import { modal } from "../../../components/Modal/Modal";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { IconModels } from "../../../assets/icons";
import { useAPI } from "../../../providers/ApiProvider";
import { ProjectContext } from "../../../providers/ProjectProvider";
import { MachineLearningList } from "./MachineLearningList";
import { CustomBackendForm } from "./Forms";
import { TestRequest } from "./TestRequest";
import { StartModelTraining } from "./StartModelTraining";
import { Block, Elem } from "../../../utils/bem";
import { ToastContext } from "@humansignal/ui";
import "./MachineLearningSettings.scss";


export const MachineLearningSettings = () => {
  const api = useAPI();
  const toast = useContext(ToastContext);
  const { project, fetchProject } = useContext(ProjectContext);
  const [backends, setBackends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [versions, setVersions] = useState([]);
  const [customWeightsPath, setCustomWeightsPath] = useState("");

  
  const fetchBackends = useCallback(async () => {
    setLoading(true);
    const models = await api.callApi("mlBackends", {
      params: {
        project: project.id,
        include_static: true,
      },
    });

    if (models) setBackends(models);
    setLoading(false);
    setLoaded(true);
  }, [project, setBackends]);

  const fetchVersions = useCallback(async() => {
    if (!backends) {
      fetchBackends().then(() => {
        fetchVersions();
      });
      return;
    }

    if (backends && backends.at(0)) {
      let backend_id = backends.at(0).id;
      setLoading(true);
      const response = await api.callApi("modelVersions", {
        params: {
          pk: backend_id,
        }
      })
      console.log(response.versions);
      if (response.versions) setVersions(response.versions);
      setLoading(false);
      setLoaded(true);
    }
  }, [backends, setVersions])

  const useCustomWeightsPath = useCallback(async () => {
    if (customWeightsPath) {
      const pk = backends.length > 0 ? backends[0].id : null;
      const response = await api.callApi("setCustomWeightsPath", {
        params: {
          pk,
        },
        body: {
          custom_weights_path: customWeightsPath,
        },
      });
      if (!response) {
        toast.show({ message: "There was an error setting the custom weights path", type: "error" });
      } else {
        toast.show({ message: "The model is now using your provided weights path", type: "success" });
      }
    }
  }, [customWeightsPath])
  
  const renderAllModelSettings = useCallback(() => {
    // TODO: fetch model settings by calling an API to the backend

    // Load from a JSON
    const settings = modelSettings["modelSettings"]["configurable"];
    let settingsToRender = [];
    for (const settingName in settings) {
      const setting = settings[settingName];

      let settingElem = null;
      switch (setting.type) {
        case "boolean":
          settingElem = (
            <Toggle
              key={settingName}
              name={settingName}
              label={setting.label}
              description={setting.description}
            />
          );
          break;
        case "dropdown":
          settingElem = (
            <Select
              key={settingName}
              name={settingName}
              label={setting.label}
              description={setting.description}
              options={setting.options}
            />
          );
          break;
        case "text":
          settingElem = (
            <Input
              key={settingName}
              name={settingName}
              label={setting.label}
              description={setting.description}
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
              description={setting.description}
            />
          );
          break;
        case "integer":
          settingElem = (
            <Counter
              key={settingName}
              name={settingName}
              label={setting.label}
              description={setting.description}
              min={setting.min ?? Number.NEGATIVE_INFINITY}
              max={setting.max ?? Number.POSITIVE_INFINITY}
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
        <Label text="Detailed Model Settings" large />
        {settingsToRender}
      </div>
    )
      
  }, []);

  const startTrainingModal = useCallback(
    (backend) => {
      const modalProps = {
        title: "Start Model Training",
        style: { width: 760 },
        closeOnClickOutside: true,
        body: <StartModelTraining backend={backend} />,
      };

      modal(modalProps);
    },
    [project],
  );

  const showRequestModal = useCallback(
    (backend) => {
      const modalProps = {
        title: "Test Request",
        style: { width: 760 },
        closeOnClickOutside: true,
        body: <TestRequest backend={backend} />,
      };

      modal(modalProps);
    },
    [project],
  );

  const showMLFormModal = useCallback(
    (backend) => {
      const action = backend ? "updateMLBackend" : "addMLBackend";
      const modalProps = {
        title: `${backend ? "Edit" : "Connect"} Model`,
        style: { width: 760 },
        closeOnClickOutside: false,
        body: (
          <CustomBackendForm
            action={action}
            backend={backend}
            project={project}
            onSubmit={() => {
              fetchBackends();
              modalRef.close();
            }}
          />
        ),
      };

      const modalRef = modal(modalProps);
    },
    [project, fetchBackends],
  );

  useEffect(() => {
    if (project.id) {
      fetchBackends();
      fetchVersions();
    }
  }, [project.id]);

  return (
    <Block name="ml-settings">
      <Elem name={"wrapper"}>
        {loading && <Spinner size={32} />}
        {loaded && backends.length === 0 && (
          <EmptyState
            icon={<IconModels />}
            title="Let’s connect your first model"
            description="Connect a machine learning model to generate predictions. These predictions can be compared side by side, used for efficient pre‒labeling and, to aid in active learning, directing users to the most impactful labeling tasks."
            action={
              <Button primary onClick={() => showMLFormModal()}>
                Connect Model
              </Button>
            }
            footer={
              <div>
                Need help?
                <br />
                <a href="https://labelstud.io/guide/ml" target="_blank" rel="noreferrer">
                  Learn more about connecting models in our docs
                </a>
              </div>
            }
          />
        )}
        <MachineLearningList
          onEdit={(backend) => showMLFormModal(backend)}
          onTestRequest={(backend) => showRequestModal(backend)}
          onStartTraining={(backend) => startTrainingModal(backend)}
          fetchBackends={fetchBackends}
          backends={backends}
        />

        {backends.length > 0 && (
          <>
            <Description>
              A connected model has been detected! If you wish to fetch predictions from this model, please follow these
              steps:
              <br />
              <br />
              1. Navigate to the <i>Data Manager</i>.<br />
              2. Select the desired tasks.
              <br />
              3. Click on <i>Retrieve predictions</i> from the <i>Actions</i> menu.
            </Description>
            <Description>
              If you want to use the model predictions for prelabeling, please configure this in the{" "}
              <NavLink to="annotation">Annotation settings</NavLink>.
            </Description>
          </>
        )}

        <Form
          action="updateProject"
          formData={{ ...project }}
          params={{ pk: project.id }}
          onSubmit={() => fetchProject()}
        >
          {backends.length > 0 && (
            <Form.Row columnCount={1}>
              <Label text="Configuration" large />

              <div>
                <Toggle
                  label="Start model training on annotation submission"
                  description="This option will send a request to /train with information about annotations. You can use this to enable an Active Learning loop. You can also manually start training through model menu in its card."
                  name="start_training_on_annotation_update"
                />
              </div>

              <br/>

              <Label text="Model Version Options" large />
              <div>
              <Select
                label="Select model version"
                placeholder="Select an option"
                options={versions}
                onClick={fetchVersions}
                name="model_version"
                />
              </div>
              
              <div>
              <Input
                label="Save model version"
                labelProps={{description: "Save the current model version with a custom name. It will permanently appear in the list of versions and the checkpoints will remain saved in the backend."}}
                placeholder="Enter a custom name for this checkpoint"
                name="model_save_name"
                />
              </div>                

            </Form.Row>
          )}

          {backends.length > 0 && (
            <Form.Actions>
              <Form.Indicator>
                <span case="success">Saved!</span>
              </Form.Indicator>
              <Button type="submit" look="primary" style={{ width: 120 }}>
                Save
              </Button>
            </Form.Actions>
          )}
        </Form>

        <br/>
        <br/>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Input
            label="Specify a weights path"
            labelProps={{description: "Specify a path on the ML backend server pointing to a custom set of weights to use."}}
            placeholder="Enter a path to the weights"
            name="custom_weights_path"
            style={{ flex: 1, marginRight: 16 }}
            value={customWeightsPath}
            onChange={e => setCustomWeightsPath(e.target.value)}
          />
          <Button
            look="primary"
            style={{ width: 120, marginTop: 10 }}
            onClick={() => {
              useCustomWeightsPath();
            }}
          >
            Submit
          </Button>
        </div>
      </Elem>
    </Block>
  );
};

MachineLearningSettings.title = "Model";
MachineLearningSettings.path = "/ml";
