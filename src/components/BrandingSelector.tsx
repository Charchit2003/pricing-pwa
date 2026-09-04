import type {
  CostOption
} from "../types/db1";

interface BrandingSelectorProps {
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

export function BrandingSelector({
  options,
  value,
  cost,
  customCost,
  onChange,
  onCustomCostChange
}: BrandingSelectorProps) {

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
          Branding *
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
            Select branding
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
            Custom branding cost *
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