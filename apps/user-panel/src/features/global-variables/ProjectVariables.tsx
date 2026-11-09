import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Popconfirm, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Globe } from "lucide-react";
import { DataTable, SplitPanel, getErrorMessage, toast, type DataColumn } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { VariablePanel } from "./components/VariablePanel";
import { ProjectVariable } from "../../types/projectVariable";
import { deleteProjectVariable, fetchProjectVariables } from "../../store/reducers/projectVariableSlice";
import { fetchDataTypes } from "../../store/reducers/dataTypeSlice";

/**
 * "panel": click a row to open the side panel (update + delete live inside it, no actions column).
 * "table": edit / delete buttons stay in every row.
 */
const ROW_ACTIONS: "panel" | "table" = "panel";

export default function GlobalVariables() {
  const dispatch = useAppDispatch();
  const projectId = useAppSelector((s) => s.scope.projectId);
  const project = useAppSelector((s) => s.userProjects.items.find((p) => p?.id === s.scope.projectId));
  const { items, status, error, deletingIds, loadedProjectId } = useAppSelector((s) => s.projectVariables);
  const dataTypes = useAppSelector((s) => s.dataTypes.items);

  // `id` stays set while the panel closes, so its content doesn't flip during the animation
  const [panel, setPanel] = useState<{ open: boolean; id?: number }>({ open: false });

  // never show another project's variables
  const variables = useMemo(
    () => (projectId != null && loadedProjectId === projectId ? items.filter(Boolean) : []),
    [items, loadedProjectId, projectId],
  );

  const current = variables.find((v) => v.id === panel.id);
  const lastRef = useRef<ProjectVariable | undefined>(undefined);
  if (current) lastRef.current = current;
  const panelVariable = panel.id != null ? (current ?? lastRef.current) : undefined;

  useEffect(() => {
    dispatch(fetchDataTypes());
  }, [dispatch]);

  // reload whenever the project selected in the sidebar changes
  useEffect(() => {
    setPanel({ open: false });
    lastRef.current = undefined;
    if (projectId != null) dispatch(fetchProjectVariables({ projectId }));
  }, [dispatch, projectId]);

  const reload = () => {
    if (projectId != null) dispatch(fetchProjectVariables({ projectId, force: true }));
  };

  const openEdit = (v: ProjectVariable) => setPanel({ open: true, id: v.id });
  const closePanel = () => setPanel((p) => ({ ...p, open: false }));

  const remove = async (v: ProjectVariable) => {
    try {
      await dispatch(deleteProjectVariable(v.id)).unwrap();
      toast.success(`${v.name} was deleted`);
    } catch (e) {
      toast.error("Couldn't delete the variable", { description: getErrorMessage(e) });
    }
  };

  const columns = useMemo<DataColumn<ProjectVariable>[]>(
    () => {
      const typeLabel = (id: number) => dataTypes.find((t) => t.id === id)?.label ?? `Type ${id}`;
      const cols: DataColumn<ProjectVariable>[] = [
        { key: "id", title: "ID", accessor: (v) => v.id, width: 90 },
        { key: "name", title: "Name", accessor: (v) => v.name },
        { key: "dataType", title: "Data type", accessor: (v) => typeLabel(v.dataTypeId), render: (v) => <Tag>{typeLabel(v.dataTypeId)}</Tag> },
        { key: "description", title: "Description", accessor: (v) => v.description },
      ];
      if (ROW_ACTIONS === "table") {
        cols.push({
          key: "actions",
          title: "",
          width: 110,
          align: "right",
          fixed: "right",
          render: (v) => (
            <div className="flex justify-end gap-1">
              <Tooltip title="Edit">
                <Button type="text" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${v.name}`} onClick={() => openEdit(v)} />
              </Tooltip>
              <Popconfirm
                title="Delete this variable?"
                description={`${v.name} will be removed from this project.`}
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => remove(v)}
              >
                <Tooltip title="Delete">
                  <Button type="text" shape="circle" danger icon={<DeleteOutlined />} aria-label={`Delete ${v.name}`} loading={deletingIds.includes(v.id)} />
                </Tooltip>
              </Popconfirm>
            </div>
          ),
        });
      }
      return cols;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataTypes, deletingIds],
  );

  if (projectId == null) return <Alert type="info" showIcon message="Select a project in the sidebar to see its global variables" />;

  return (
    <SplitPanel
      open={panel.open}
      width="25%"
      panel={<VariablePanel open={panel.open} projectId={projectId} variable={panelVariable} onClose={closePanel} />}
    >
      <div className="space-y-6 p-4 md:p-4">
        <header className="flex items-start">
          <span className="grid size-9 place-items-center rounded-xl text-primary">
            <Globe className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-content">Global variables</h2>
            <p className="text-sm text-muted">Values and record shapes every endpoint in {project?.name ?? "this project"} can use. Pick one in any "Value from" cell as <span className="bg-primary/20 text-primary font-semibold   px-1 rounded-md">Global</span>.</p>
          </div>
        </header>

        {status === "failed" && (
          <Alert type="error" showIcon message="Couldn't load variables" description={error} action={<Button size="small" onClick={reload}>Try again</Button>} />
        )}

        <DataTable<ProjectVariable>
          data={variables}
          columns={columns}
          rowKey={(v) => v.id}
          loading={status === "loading"}
          searchPlaceholder="Search by name"
          exportName="global-variables"
          onRefresh={reload}
          emptyText="No variables yet"
          onRowClick={ROW_ACTIONS === "panel" ? openEdit : undefined}
          selectedKey={panel.open ? panel.id : null}
          toolbar={<Button type="primary" icon={<PlusOutlined />} onClick={() => setPanel({ open: true })}>Add variable</Button>}
        />
      </div>
    </SplitPanel>
  );
}