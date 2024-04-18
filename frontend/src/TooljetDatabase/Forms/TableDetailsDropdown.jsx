import React, { useState } from 'react';
import { ToolTip } from '@/_components/ToolTip';
import DropDownSelect from '../../Editor/QueryManager/QueryEditors/TooljetDatabase/DropDownSelect';
import Information from '@/_ui/Icon/solidIcons/Information';
import DropdownInformation from '../Icons/dropdownInfo.svg';

function TableDetailsDropdown({
  firstColumnName,
  secondColumnName,
  firstColumnPlaceholder,
  secondColumnPlaceholder,
  tableList = [],
  tableColumns = [],
  source = false,
  handleSelectColumn = () => {},
  showColumnInfo = false,
  updateSelectedSourceColumns = () => {},
  selectedSourceColumn = {},
  showRedirection = false,
  showDescription = false,
}) {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  const [column, setColumn] = useState({});
  const [table, setTable] = useState({});
  return (
    <div className="mt-3">
      <div className="d-flex align-items-center justify-content-between">
        <span className="keyRelation-column-title">{firstColumnName}</span>

        <ToolTip message={source ? 'Current table' : ''} placement="top" tooltipClassName="tootip-table" show={source}>
          <div style={{ width: '80%' }}>
            <DropDownSelect
              buttonClasses="border border-end-1 foreignKeyAcces-container"
              showPlaceHolder={true}
              options={tableList}
              darkMode={darkMode}
              emptyError={
                <div className="dd-select-alert-error m-2 d-flex align-items-center">
                  <Information />
                  No table selected
                </div>
              }
              value={source ? tableList[0] : table}
              foreignKeyAccess={true}
              disabled={source ? true : false}
              onChange={(value) => {
                setTable(value);
                handleSelectColumn(value?.value);
              }}
              onAdd={true}
              addBtnLabel={'Add new table'}
              showRedirection={showRedirection}
              showDescription={showDescription}
            />
          </div>
        </ToolTip>
      </div>

      <div className="d-flex align-items-center justify-content-between mt-2">
        <span className="keyRelation-column-title">{secondColumnName}</span>
        <div style={{ width: '80%' }}>
          <DropDownSelect
            buttonClasses="border border-end-1 foreignKeyAcces-container"
            showPlaceHolder={true}
            options={tableColumns.length > 0 ? tableColumns : []}
            darkMode={darkMode}
            emptyError={
              <div className="dd-select-alert-error m-2 d-flex align-items-center">
                <Information />
                {tableColumns.length === 0 ? 'There are no columns of the same datatype' : 'No table selected yet'}
              </div>
            }
            value={source ? selectedSourceColumn : column}
            foreignKeyAccess={true}
            onChange={(value) => {
              if (source) {
                updateSelectedSourceColumns(value);
              } else {
                setColumn(value);
              }
            }}
            onAdd={true}
            addBtnLabel={'Add new column'}
            columnInfoForTable={
              <div className="columnInfoForTable m-2 d-flex align-items-center">
                <DropdownInformation />
                Only columns of same data type can be added
              </div>
            }
            showColumnInfo={showColumnInfo}
            showDescription={showDescription}
          />
        </div>
      </div>
    </div>
  );
}

export default TableDetailsDropdown;
