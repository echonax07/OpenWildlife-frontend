import { inject, observer } from "mobx-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Block, Elem } from "../../../utils/bem";
import { PanelBase, type PanelProps } from "../PanelBase";
import { OutlinerTree } from "./OutlinerTree";
import { ViewControls } from "./ViewControls";
import "./OutlinerPanel.scss";
import { IconInfo } from "../../../assets/icons/outliner";
import { FF_LSDV_4992, FF_OUTLINER_OPTIM, isFF } from "../../../utils/feature-flags";

interface OutlinerPanelProps extends PanelProps {
  store: any;
  regions: any;
}

interface OutlinerTreeComponentProps {
  store: any;
  regions: any;
}

const OutlinerFFClasses: string[] = [];

if (isFF(FF_LSDV_4992)) {
  OutlinerFFClasses.push("ff_hide_all_regions");
}
if (isFF(FF_OUTLINER_OPTIM)) {
  OutlinerFFClasses.push("ff_outliner_optim");
}

const setHidden = (region: any, hidden: boolean) => {
    if (region && region.hidden !== hidden) {
      region.toggleHidden();
    }
}

const OutlinerPanelComponent: FC<OutlinerPanelProps> = ({ store, regions, ...props }) => {
  const [group, setGroup] = useState();
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);

  const onConfThreshChange = useCallback(
    (value) => {
      setConfidenceThreshold(value);
      // Value comes in as a number between 0 and 100. Convert it to a decimal.
      value = value/100;
      store.settings.setProperty("confidenceThreshold", value); // This is later used during submission to create an alert message.
      for (const region of regions.regions) {
        // For prediction-changed or user generated regions, we never hide them based on confidence.
        if (region.origin == "prediction") {
          setHidden(region, region.score < value);
          const { history } = store.annotationStore.selected;
          if (!history.canUndo) {
            history.recordNow();
          }
        }
      }
    },
    [regions],
  );

  const onOrderingChange = useCallback(
    (value) => {
      regions.setSort(value);
    },
    [regions],
  );

  const onGroupingChange = useCallback(
    (value) => {
      regions.setGrouping(value);
      setGroup(value);
    },
    [regions],
  );

  const onFilterChange = useCallback(
    (value) => {
      regions.setFilteredRegions(value);
    },
    [regions],
  );

  useEffect(() => {
    setGroup(regions.group);
  }, []);

  regions.setGrouping(group);

  return (
    <PanelBase {...props} name="outliner" mix={OutlinerFFClasses} title="Outliner">
      <ViewControls
        ordering={regions.sort}
        confidenceThreshold={confidenceThreshold}
        regions={regions}
        orderingDirection={regions.sortOrder}
        onOrderingChange={onOrderingChange}
        onGroupingChange={onGroupingChange}
        onConfThreshChange={onConfThreshChange}
        onFilterChange={onFilterChange}
      />
      <OutlinerTreeComponent regions={regions} />
    </PanelBase>
  );
};

const OutlinerStandAlone: FC<OutlinerPanelProps> = ({ store, regions }) => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);

  const onConfThreshChange = useCallback(
    (value) => {
      setConfidenceThreshold(value);
      // Value comes in as a number between 0 and 100. Convert it to a decimal.
      value = value/100;
      store.settings.setProperty("confidenceThreshold", value); // This is later used during submission to create an alert message.
      for (const region of regions.regions) {
        // For prediction-changed or user generated regions, we never hide them based on confidence.
        if (region.origin == "prediction") {
          setHidden(region, region.score < value);
          const { history } = store.annotationStore.selected;
          if (!history.canUndo) {
            history.recordNow();
          }
        }
      }
    },
    [regions],
  );

  const onOrderingChange = useCallback(
    (value) => {
      regions.setSort(value);
    },
    [regions],
  );

  const onGroupingChange = useCallback(
    (value) => {
      regions.setGrouping(value);
    },
    [regions],
  );

  const onFilterChange = useCallback(
    (value) => {
      regions.setFilteredRegions(value);
    },
    [regions],
  );

  return (
    <Block name="outliner" mix={OutlinerFFClasses}>
      <ViewControls
        ordering={regions.sort}
        confidenceThreshold={confidenceThreshold}
        regions={regions}
        orderingDirection={regions.sortOrder}
        showConfThresh={!store.settings.highAnnotClustering}
        onOrderingChange={onOrderingChange}
        onGroupingChange={onGroupingChange}
        onConfThreshChange={onConfThreshChange}
        onFilterChange={onFilterChange}
      />
      <OutlinerTreeComponent regions={regions} />
    </Block>
  );
};

const OutlinerTreeComponent: FC<OutlinerTreeComponentProps> = observer(({ regions }) => {
  const allRegionsHidden = regions?.regions?.length > 0 && regions?.filter?.length === 0;

  const hiddenRegions = useMemo(() => {
    if (!regions?.regions?.length || !regions.filter?.length) return 0;

    return regions?.regions?.length - regions?.filter?.length;
  }, [regions?.regions?.length, regions?.filter?.length]);

  return (
    <>
      {allRegionsHidden ? (
        <Block name="filters-info">
          <IconInfo width={21} height={20} />
          <Elem name="filters-title">All regions hidden</Elem>
          <Elem name="filters-description">Adjust or remove the filters to view</Elem>
        </Block>
      ) : regions?.regions?.length > 0 ? (
        <>
          <OutlinerTree
            regions={regions}
            footer={
              hiddenRegions > 0 && (
                <Block name="filters-info">
                  <IconInfo width={21} height={20} />
                  <Elem name="filters-title">
                    There {hiddenRegions === 1 ? "is" : "are"} {hiddenRegions} hidden region{hiddenRegions > 1 && "s"}
                  </Elem>
                  <Elem name="filters-description">Adjust or remove filters to view</Elem>
                </Block>
              )
            }
          />
        </>
      ) : (
        <Elem name="empty">Regions not added</Elem>
      )}
    </>
  );
});

export const OutlinerComponent = inject("store")(observer(OutlinerStandAlone));

export const OutlinerPanel = inject("store")(observer(OutlinerPanelComponent));
