import type {
  CostOption
} from "../types/db1";

interface LaborSelectorProps {
  options: CostOption[];

  value: string;

  cost: number;

  customCost: string;

  onChange: (
    type: string,
    cost: number
  ) => void;

  onCustomCostChange: (
    cost: number
  ) => void;
}

export function LaborSelector({
  options,
  value,
  cost,
  customCost,
  onChange,
  onCustomCostChange
}: LaborSelectorProps) {

  const isCustom =
    value === "Custom";

  function handleChange(
    type: string
  ) {
    const option =
      options.find(
        (item) =>
          item.type === type
      );

    onChange(
      type,
      option?.cost ?? 0
    );
  }

  return (
    <div className="cost-selector">

      <div className="form-field">

        <label>
          Labor *
        </label>

        <select
          value={value}
          onChange={(event) =>
            handleChange(
              event.target.value
            )
          }
        >

          <option value="">
            Select labor
          </option>

          {options.map(
            (option) => (
              <option
                key={option.type}
                value={option.type}
              >
                {option.type}
              </option>
            )
          )}

        </select>

      </div>

      {isCustom ? (

        <div className="form-field">

          <label>
            Custom labor cost *
          </label>

          <input
            type="number"
            step="any"
            value={customCost}
            onChange={(event) =>
              onCustomCostChange(
                Number(event.target.value)
              )
            }
          />

        </div>

      ) : value ? (

        <div className="cost-display">
          Cost: ₹{cost.toFixed(2)}
        </div>

      ) : null}

    </div>
  );
}