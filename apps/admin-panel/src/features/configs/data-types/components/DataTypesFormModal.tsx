import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { ApiOutlined } from "@ant-design/icons";

import {
  Input,
  Modal,
  getErrorMessage,
  toast,
} from "@repo/shared";

import { useAppDispatch, useAppSelector } from "../../../../store";

import {
  createDataTypes,
  updateDataTypes,
} from "../../../../store/reducers/dataTypesSlice";

import type {
  dataTypes,
  dataTypesInput,
} from "../../../../types/dataTypes";

interface FormValues {
  name: string;
  label: string;
}

interface Props {
  open: boolean;
  dataTypes?: dataTypes;
  onClose: () => void;
}

/**
 * Technical name format:
 *
 * java.string
 * java.integer
 * java.boolean
 * java.util.date
 *
 * Each segment must start with a lowercase letter.
 */
const NAME_REGEX = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/;

export function DataTypesFormModal({
  open,
  dataTypes: selectedDataType,
  onClose,
}: Props) {
  const dispatch = useAppDispatch();

  const { items, saving } = useAppSelector(
    (state) => state.dataTypes
  );

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      label: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  /**
   * Reset form whenever the modal opens.
   */
  useEffect(() => {
    if (!open) return;

    reset({
      name: selectedDataType?.name ?? "",
      label: selectedDataType?.label ?? "",
    });

    setServerError(null);
  }, [open, selectedDataType, reset]);

  /**
   * Validate technical name.
   */
  const validateName = (rawName: string) => {
    const name = rawName.trim().toLowerCase();

    if (!name) {
      return "Enter the technical name";
    }

    if (!NAME_REGEX.test(name)) {
      return "Use lowercase letters, numbers and dots (e.g. java.string)";
    }

    const existingDataType = items.find(
      (item) =>
        item.id !== selectedDataType?.id &&
        item.name.trim().toLowerCase() === name
    );

    if (existingDataType) {
      return `Technical name "${name}" already exists`;
    }

    return true;
  };

  /**
   * Validate descriptive label.
   */
  const validateLabel = (rawLabel: string) => {
    const label = rawLabel.trim();

    if (!label) {
      return "Enter the label";
    }

    const existingDataType = items.find(
      (item) =>
        item.id !== selectedDataType?.id &&
        item.label.trim().toLowerCase() === label.toLowerCase()
    );

    if (existingDataType) {
      return `Label "${label}" already exists`;
    }

    return true;
  };

  /**
   * Submit form.
   */
  const submitData = async (values: FormValues) => {
    if (saving) return;

    setServerError(null);

    const payload: dataTypesInput = {
      name: values.name.trim().toLowerCase(),
      label: values.label.trim(),
    };

    try {
      if (selectedDataType) {
        await dispatch(
          updateDataTypes({
            id: selectedDataType.id,
            ...payload,
          })
        ).unwrap();
      } else {
        await dispatch(createDataTypes(payload)).unwrap();
      }

      toast.success(
        selectedDataType
          ? "Data type updated successfully"
          : "Data type added successfully"
      );

      onClose();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="md"
      align="center"
      icon={<ApiOutlined />}
      title={selectedDataType ? "Update Data Type" : "Add Data Type"}
      description={
        selectedDataType
          ? `Update ${selectedDataType.name}`
          : "Add a new API data type"
      }
      footer={
        <>
          <Button
            onClick={onClose}
            disabled={saving}
            size="middle"
          >
            Cancel
          </Button>

          <Button
            type="primary"
            loading={saving}
            disabled={saving}
            size="middle"
            onClick={handleSubmit(submitData)}
          >
            {selectedDataType ? "Save changes" : "Add Data Type"}
          </Button>
        </>
      }
    >
      <form
        id="dataType-form"
        onSubmit={handleSubmit(submitData)}
        noValidate
        className="flex flex-col gap-4"
      >
        {serverError && (
          <Alert
            type="error"
            showIcon
            message={serverError}
            closable
            onClose={() => setServerError(null)}
          />
        )}

        {/* Technical name */}
        <Controller
          name="name"
          control={control}
          rules={{
            required: "Enter the technical name",
            validate: validateName,
          }}
          render={({ field }) => (
            <Input
              {...field}
              label="Name"
              required
              autoComplete="off"
              placeholder="e.g. java.string"
              error={errors.name?.message}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                field.onChange(event.target.value.toLowerCase());
              }}
            />
          )}
        />

        <p className="-mt-3 text-xs text-muted">
          Technical identifier used by the API, e.g. java.string
        </p>

        {/* Descriptive label */}
        <Controller
          name="label"
          control={control}
          rules={{
            required: "Enter the label",
            validate: validateLabel,
          }}
          render={({ field }) => (
            <Input
              {...field}
              label="Label"
              required
              autoComplete="off"
              placeholder="e.g. String"
              error={errors.label?.message}
            />
          )}
        />

        <p className="-mt-3 text-xs text-muted">
          Human-readable description displayed throughout the application.
        </p>
      </form>
    </Modal>
  );
}