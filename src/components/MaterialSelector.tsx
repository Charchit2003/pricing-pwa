import type {
  MaterialDefinition
} from "../types/db1";

interface MaterialSelectorProps {
  materials: MaterialDefinition[];

  value: string;

  onChange: (
    materialId: string
  ) => void;
}

export function MaterialSelector({
  materials,
  value,
  onChange
}: MaterialSelectorProps) {

  return (
    <div className="form-field">

      <label>
        Material
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >

        <option value="">
          Select material
        </option>

        {materials.map(
          (material) => (
            <option
              key={material.materialId}
              value={material.materialId}
            >
              {material.materialName}
            </option>
          )
        )}

      </select>

    </div>
  );
}