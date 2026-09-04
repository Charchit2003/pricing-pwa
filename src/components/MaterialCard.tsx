// MaterialCard.tsx

import type {
  MaterialDefinition
} from "../types/db1";

import type {
  QuoteMaterial
} from "../types/db2";

interface MaterialCardProps {
  material: MaterialDefinition;
  value: QuoteMaterial;

  onChange: (
    value: QuoteMaterial
  ) => void;

  onRemove: () => void;

  canRemove: boolean;
}

export function MaterialCard({
  material,
  value,
  onChange,
  onRemove,
  canRemove
}: MaterialCardProps) {

  function updateQuestion(
    questionId: string,
    rawValue: string
  ) {

    const numericValue =
      rawValue === ""
        ? undefined
        : Number(rawValue);

    const question =
      material.questions[
        questionId
      ];

    if (!question) {
      return;
    }

    onChange({
      ...value,

      questions: {
        ...value.questions,

        [questionId]: {
          name: question.name,

          value:
            numericValue ?? NaN
        }
      }
    });
  }

  const cost =
    value.results.R_Cost?.value ??
    value.results.R_COST?.value ??
    value.results.r_cost?.value;

  return (
    <div className="material-card">

      <div className="material-card-header">

        <h3>
          {material.materialName}
        </h3>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
          >
            Remove
          </button>
        )}

      </div>

      <div className="questions">

        {Object.entries(
          material.questions
        ).map(
          ([questionId, question]) => {

            const questionValue =
              value.questions[
                questionId
              ];

            return (
              <div
                className="form-field"
                key={questionId}
              >

                <label>
                  {question.label}
                  {question.required &&
                    " *"}
                </label>

                <input
                  type="number"
                  step="any"
                  value={
                    questionValue
                      ?.value ?? ""
                  }
                  onChange={(event) =>
                    updateQuestion(
                      questionId,
                      event.target.value
                    )
                  }
                />

              </div>
            );
          }
        )}

      </div>

      <div className="result">

        <span>Rate</span>

        <strong>
          {formatNumber(cost)}
        </strong>

      </div>

    </div>
  );
}

function formatNumber(
  value: number | undefined
): string {

  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "-";
  }

  return value.toFixed(2);
}