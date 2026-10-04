/**
 * Re-export ProjectWizardModal as NewProjectModal for backwards compatibility
 * while providing the full multi-step Project Wizard.
 */
import React from 'react';
import { ProjectWizardModal, ProjectWizardModalProps, PROJECT_TEMPLATES } from './ProjectWizardModal';

export { ProjectWizardModal, PROJECT_TEMPLATES };
export type { ProjectWizardModalProps, ProjectTemplate } from './ProjectWizardModal';

export const NewProjectModal: React.FC<ProjectWizardModalProps> = (props) => {
  return <ProjectWizardModal {...props} />;
};
