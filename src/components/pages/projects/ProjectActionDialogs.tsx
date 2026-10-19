import { useEffect, useState } from 'react';
import _ from 'lodash';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import FormField from 'src/components/common/FormField';
import Modal from 'src/components/common/Modal';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { Button } from 'src/components/shadui/button';
import {
  createProjectFolder, deleteProject, deleteProjectFolder, renameProject, renameProjectFolder,
} from 'src/services/project';
import type { Project, ProjectFolder } from 'src/types/project';

// Same limit as the BE (and the new-project form).
const _NAME_MAX_LENGTH = 200;

// Original purpose: the project card's (and the sidebar's) "Rename" menu item.
// Intentions: a one-field dialog, pre-filled with the current name. Open while `project` is set; the parent
// gets the renamed project back to swap into its list.
export function RenameProjectModal({ project, onClose, onRenamed }: {
  project: Project | null;
  onClose: () => void;
  onRenamed: (project: Project) => void;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ name: string }>({
    mode: 'onSubmit',
    defaultValues: { name: '' },
  });

  // Each opening starts from that project's current name.
  useEffect(() => {
    if (project) {
      reset({ name: project.name });
    }
  }, [project, reset]);

  const rename = async ({ name }: { name: string }) => {
    try {
      onRenamed(await renameProject((project as Project).id, _.trim(name)));
      notify('success', t('project_rename_done'));
      onClose();
    } catch {
      notify('error', t('project_rename_failed'));
    }
  };

  return (
    <Modal
      open={!!project}
      onClose={() => !isSubmitting && onClose()}
      title={t('project_rename_title')}
      fullScreenMobile={false}
      buttons={[
        <Button key='cancel' variant='outline' disabled={isSubmitting} onClick={onClose}>{t('project_action_cancel')}</Button>,
        <Button key='save' type='submit' form='rename-project-form' disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon='inline-start' />}
          {t('project_rename_save')}
        </Button>,
      ]}
    >
      <form id='rename-project-form' data-projectid={project?.id} noValidate onSubmit={handleSubmit(rename)}>
        <Controller
          name='name'
          control={control}
          rules={{ validate: value => !_.isEmpty(_.trim(value)) || t('new_project_required') }}
          render={({ field, fieldState }) => (
            <FormField
              label={t('new_project_name_label')}
              maxLength={_NAME_MAX_LENGTH}
              autoFocus
              fullWidth
              disabled={isSubmitting}
              value={field.value}
              onChange={field.onChange}
              error={!_.isNil(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
      </form>
    </Modal>
  );
}

// Original purpose: the project card's (and the sidebar's) "Delete" menu item.
// Intentions: an "are you sure" that names the project, since there's no undo for the user. Open while
// `project` is set; the parent drops it from its list once it's gone.
export function DeleteProjectModal({ project, onClose, onDeleted }: {
  project: Project | null;
  onClose: () => void;
  onDeleted: (projectId: number) => void;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async () => {
    const target = project as Project;
    setIsDeleting(true);
    try {
      await deleteProject(target.id);
      onDeleted(target.id);
      notify('success', t('project_delete_done', { name: target.name }));
      onClose();
    } catch {
      notify('error', t('project_delete_failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open={!!project}
      onClose={() => !isDeleting && onClose()}
      title={t('project_delete_title', { name: project?.name })}
      fullScreenMobile={false}
      buttons={[
        <Button key='cancel' variant='outline' disabled={isDeleting} onClick={onClose}>{t('project_action_cancel')}</Button>,
        <Button key='delete' variant='destructive' disabled={isDeleting} onClick={remove}>
          {isDeleting && <Spinner data-icon='inline-start' />}
          {t('project_delete_confirm')}
        </Button>,
      ]}
    >
      <p data-projectid={project?.id} className='text-muted-foreground'>{t('project_delete_body')}</p>
    </Modal>
  );
}

// Original purpose: the sidebar's "New folder" (from the Folders header, or "Move to" › "New folder") and a
// folder's "Rename".
// Intentions: one name field. `folder` says which: 'new' makes one, a folder renames it; null = closed.
// The parent gets the saved folder back (to put in its list, or to file a project into).
export function FolderNameModal({ folder, onClose, onSaved }: {
  folder: ProjectFolder | 'new' | null;
  onClose: () => void;
  onSaved: (folder: ProjectFolder) => void;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const isNew = folder === 'new';
  const { control, handleSubmit, reset, setError, formState: { isSubmitting } } = useForm<{ name: string }>({
    mode: 'onSubmit',
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (folder) {
      reset({ name: isNew ? '' : folder.name });
    }
  }, [folder, isNew, reset]);

  const save = async ({ name }: { name: string }) => {
    try {
      onSaved(isNew ? await createProjectFolder(_.trim(name)) : await renameProjectFolder((folder as ProjectFolder).id, _.trim(name)));
      onClose();
    } catch (error) {
      if (_.get(error, 'data.detail') === 'FOLDER_NAME_TAKEN') {
        setError('name', { message: t('folder_name_taken') });
        return;
      }
      notify('error', t('folder_save_failed'));
    }
  };

  return (
    <Modal
      open={!!folder}
      onClose={() => !isSubmitting && onClose()}
      title={isNew ? t('folder_new_title') : t('folder_rename_title')}
      fullScreenMobile={false}
      buttons={[
        <Button key='cancel' variant='outline' disabled={isSubmitting} onClick={onClose}>{t('project_action_cancel')}</Button>,
        <Button key='save' type='submit' form='folder-name-form' disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon='inline-start' />}
          {isNew ? t('folder_create') : t('project_rename_save')}
        </Button>,
      ]}
    >
      <form id='folder-name-form' noValidate onSubmit={handleSubmit(save)}>
        <Controller
          name='name'
          control={control}
          rules={{ validate: value => !_.isEmpty(_.trim(value)) || t('new_project_required') }}
          render={({ field, fieldState }) => (
            <FormField
              label={t('folder_name_label')}
              placeholder={t('folder_name_placeholder')}
              maxLength={_NAME_MAX_LENGTH}
              autoFocus
              fullWidth
              disabled={isSubmitting}
              value={field.value}
              onChange={field.onChange}
              error={!_.isNil(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
      </form>
    </Modal>
  );
}

// Original purpose: a sidebar folder's "Delete".
// Intentions: confirm, saying plainly that the projects inside are kept (they go back to the recents).
export function DeleteFolderModal({ folder, onClose, onDeleted }: {
  folder: ProjectFolder | null;
  onClose: () => void;
  onDeleted: (folderId: number) => void;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async () => {
    const target = folder as ProjectFolder;
    setIsDeleting(true);
    try {
      await deleteProjectFolder(target.id);
      onDeleted(target.id);
      onClose();
    } catch {
      notify('error', t('folder_delete_failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open={!!folder}
      onClose={() => !isDeleting && onClose()}
      title={t('folder_delete_title', { name: folder?.name })}
      fullScreenMobile={false}
      buttons={[
        <Button key='cancel' variant='outline' disabled={isDeleting} onClick={onClose}>{t('project_action_cancel')}</Button>,
        <Button key='delete' variant='destructive' disabled={isDeleting} onClick={remove}>
          {isDeleting && <Spinner data-icon='inline-start' />}
          {t('project_delete_confirm')}
        </Button>,
      ]}
    >
      <p className='text-muted-foreground'>{t('folder_delete_body')}</p>
    </Modal>
  );
}
