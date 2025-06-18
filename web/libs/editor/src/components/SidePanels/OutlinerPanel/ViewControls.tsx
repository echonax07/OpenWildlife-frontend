import { type FC, useCallback, useContext, useMemo } from "react";
import {
  IconCursor,
  IconDetails,
  IconFilter,
  IconList,
  IconOutlinerEyeClosed,
  IconOutlinerEyeOpened,
  IconSortDown,
  IconSortDownNew,
  IconSortUp,
  IconSortUpNew,
  IconSpeed,
  IconTagAlt,
} from "../../../assets/icons";
import { Button } from "../../../common/Button/Button";
import { Dropdown } from "../../../common/Dropdown/Dropdown";
// eslint-disable-next-line
// @ts-ignore
import { Menu } from "../../../common/Menu/Menu";
import { BemWithSpecifiContext } from "../../../utils/bem";
import { SidePanelsContext } from "../SidePanelsContext";
import "./ViewControls.scss";
import { FF_DEV_3873, FF_LSDV_4992, isFF } from "../../../utils/feature-flags";
import { observer } from "mobx-react";
import { IconConfig } from "libs/editor/src/assets/icons/timeline";

const { Block, Elem } = BemWithSpecifiContext();

export type GroupingOptions = "manual" | "label" | "type";

export type OrderingOptions = "score" | "date";

export type OrderingDirection = "asc" | "desc";

interface ViewControlsProps {
  ordering: OrderingOptions;
  orderingDirection?: OrderingDirection;
  confidenceThreshold: number;
  regions: any;
  showConfThresh: boolean;
  onOrderingChange: (ordering: OrderingOptions) => void;
  onGroupingChange: (grouping: GroupingOptions) => void;
  onConfThreshChange: (confidence: number) => void;
  onFilterChange: (filter: any) => void;
}

export const ViewControls: FC<ViewControlsProps> = observer(
  ({ ordering, confidenceThreshold, regions, showConfThresh, orderingDirection, onOrderingChange, onGroupingChange, onConfThreshChange, onFilterChange }) => {
    const grouping = regions.group;
    const context = useContext(SidePanelsContext);
    const getGroupingLabels = useCallback((value: GroupingOptions): LabelInfo => {
      switch (value) {
        case "manual":
          return {
            label: "Group Manually",
            selectedLabel: isFF(FF_DEV_3873) ? "Manual" : "Manual Grouping",
            icon: <IconList />,
            tooltip: "Manually Grouped",
          };
        case "label":
          return {
            label: "Group by Label",
            selectedLabel: isFF(FF_DEV_3873) ? (isFF(FF_LSDV_4992) ? "By Label" : "Label") : "Grouped by Label",
            icon: <IconTagAlt />,
            tooltip: "Grouped by Label",
          };
        case "type":
          return {
            label: "Group by Tool",
            selectedLabel: isFF(FF_DEV_3873) ? (isFF(FF_LSDV_4992) ? "By Tool" : "Tool") : "Grouped by Tool",
            icon: <IconCursor />,
            tooltip: "Grouped by Tool",
          };
      }
    }, []);

    const getOrderingLabels = useCallback((value: OrderingOptions): LabelInfo => {
      switch (value) {
        case "date":
          return {
            label: "Order by Time",
            selectedLabel: "By Time",
            icon: <IconDetails />,
          };
        case "score":
          return {
            label: "Order by Score",
            selectedLabel: "By Score",
            icon: <IconSpeed />,
          };
      }
    }, []);

    const renderOrderingDirectionIcon =
      orderingDirection === "asc" ? (
        <IconSortUpNew style={{ color: "#898098" }} />
      ) : (
        <IconSortDownNew style={{ color: "#898098" }} />
      );

    return (
      <Block name="view-controls" mod={{ collapsed: context.locked, FF_LSDV_4992: isFF(FF_LSDV_4992) }}>
        <Grouping
          value={grouping}
          options={["manual", "type", "label"]}
          onChange={(value) => onGroupingChange(value)}
          readableValueForKey={getGroupingLabels}
        />
        {grouping === "manual" && (
          <Elem name="sort">
            <Grouping
              value={ordering}
              direction={orderingDirection}
              options={["score", "date"]}
              onChange={(value) => onOrderingChange(value)}
              readableValueForKey={getOrderingLabels}
              allowClickSelected
              extraIcon={renderOrderingDirectionIcon}
            />
          </Elem>
        )}
        <Elem name="filter">
          <DropdownSlider
            value={confidenceThreshold}
            onChange={(v) => onConfThreshChange(v)}
            enabled={showConfThresh}
          />
        </Elem>
        {isFF(FF_LSDV_4992) ? <ToggleRegionsVisibilityButton regions={regions} /> : null}
      </Block>
    );
  },
);

interface LabelInfo {
  label: string;
  selectedLabel: string;
  icon: JSX.Element;
  tooltip?: string;
}

interface GroupingProps<T extends string> {
  value: T;
  options: T[];
  direction?: OrderingDirection;
  allowClickSelected?: boolean;
  onChange: (value: T) => void;
  readableValueForKey: (value: T) => LabelInfo;
  extraIcon?: JSX.Element;
}

interface DropdownSliderProps {
  value: number;
  onChange: (value: number) => void;
  extraIcon?: JSX.Element;
}

const DropdownSlider = ({
  value,
  onChange,
  enabled,
  extraIcon
}: DropdownSliderProps) => {

  // mods are already set in the button from type, so use it only in new UI
  const extraStyles = isFF(FF_DEV_3873) ? { mod: { newUI: true } } : undefined;
  const style = isFF(FF_LSDV_4992)
    ? {}
    : {
        padding: "0",
        whiteSpace: "nowrap",
      };

  if (isFF(FF_DEV_3873)) {
    style.padding = "0 12px 0 2px";
  }

  const renderConfSlider = useMemo(() => {
    return (
      <Elem name="slider" style={{ padding: "12px" }}>
        <Elem name="slider-content">
          <Elem name="slider-label">Confidence Threshold: {value/100}</Elem>
          <Elem name="slider-input">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
          </Elem>
        </Elem>
      </Elem>
    );
  }, [value, onChange]);

  return (
    <Dropdown.Trigger content={
      enabled ? renderConfSlider : <Elem name="disabled-slider" style={{ padding: "12px" }}>Disable keypoint clustering in settings to enable the confidence slider.</Elem>
    } style={{ width: 200 }}>
      <Button
        type="text"
        data-testid={`conf-slider-${value}`}
        {...extraStyles}
        icon={<IconFilter style={{ color: "#898098" }} />}
        style={style}
        extra={extraIcon}
      >
        Conf Thresh
      </Button>
    </Dropdown.Trigger>
  );
}

const Grouping = <T extends string>({
  value,
  options,
  direction,
  allowClickSelected,
  onChange,
  readableValueForKey,
  extraIcon,
}: GroupingProps<T>) => {
  const readableValue = useMemo(() => {
    return readableValueForKey(value);
  }, [value]);

  const optionsList: [T, LabelInfo][] = useMemo(() => {
    return options.map((key) => [key, readableValueForKey(key)]);
  }, []);

  const dropdownContent = useMemo(() => {
    return (
      <Menu
        size="medium"
        style={{
          width: 200,
          minWidth: 200,
          borderRadius: isFF(FF_DEV_3873) && 4,
        }}
        selectedKeys={[value]}
        allowClickSelected={allowClickSelected}
      >
        {optionsList.map(([key, label]) => (
          <GroupingMenuItem
            key={key}
            name={key}
            value={value}
            direction={direction}
            label={label}
            onChange={(value) => onChange(value)}
          />
        ))}
      </Menu>
    );
  }, [value, optionsList, readableValue, direction, onChange]);

  // mods are already set in the button from type, so use it only in new UI
  const extraStyles = isFF(FF_DEV_3873) ? { mod: { newUI: true } } : undefined;
  const style = isFF(FF_LSDV_4992)
    ? {}
    : {
        padding: "0",
        whiteSpace: "nowrap",
      };

  if (isFF(FF_DEV_3873)) {
    style.padding = "0 12px 0 2px";
  }

  return (
    <Dropdown.Trigger content={dropdownContent} style={{ width: 200 }}>
      <Button
        type="text"
        data-testid={`grouping-${value}`}
        {...extraStyles}
        icon={readableValue.icon}
        style={style}
        extra={
          isFF(FF_DEV_3873) ? (
            extraIcon
          ) : (
            <DirectionIndicator direction={direction} name={value} value={value} wrap={false} />
          )
        }
        tooltip={(isFF(FF_LSDV_4992) && readableValue.tooltip) || undefined}
        tooltipTheme="dark"
      >
        {readableValue.selectedLabel}
      </Button>
    </Dropdown.Trigger>
  );
};

interface GroupingMenuItemProps<T extends string> {
  name: T;
  label: LabelInfo;
  value: T;
  direction?: OrderingDirection;
  onChange: (key: T) => void;
}

const GroupingMenuItem = <T extends string>({ value, name, label, direction, onChange }: GroupingMenuItemProps<T>) => {
  return (
    <Menu.Item name={name} onClick={() => onChange(name)}>
      <Elem name="label">
        {label.label}
        <DirectionIndicator direction={direction} name={name} value={value} />
      </Elem>
    </Menu.Item>
  );
};

interface DirectionIndicator {
  direction?: OrderingDirection;
  value: string;
  name: string;
  wrap?: boolean;
}

const DirectionIndicator: FC<DirectionIndicator> = ({ direction, value, name, wrap = true }) => {
  const content = direction === "asc" ? <IconSortUp /> : <IconSortDown />;

  if (!direction || value !== name || isFF(FF_DEV_3873)) return null;
  if (!wrap) return content;

  return <span>{content}</span>;
};

interface ToggleRegionsVisibilityButton {
  regions: any;
}

const ToggleRegionsVisibilityButton = observer<FC<ToggleRegionsVisibilityButton>>(({ regions }) => {
  const toggleRegionsVisibility = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      regions.toggleVisibility();
    },
    [regions],
  );

  const isDisabled = !regions?.regions?.length;
  const isAllHidden = !isDisabled && regions.isAllHidden;

  return (
    <Elem
      tag={Button}
      type="text"
      disabled={isDisabled}
      onClick={toggleRegionsVisibility}
      mod={{ hidden: isAllHidden }}
      aria-label={isAllHidden ? "Show all regions" : "Hide all regions"}
      icon={isAllHidden ? <IconOutlinerEyeClosed /> : <IconOutlinerEyeOpened />}
      tooltip={isAllHidden ? "Show all regions" : "Hide all regions"}
      tooltipTheme="dark"
    />
  );
});
