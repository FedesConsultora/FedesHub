import { useState } from 'react';
import Avatar from '../Avatar.jsx';
import { MdKeyboardArrowDown, MdClose } from 'react-icons/md';
import { CiCirclePlus } from "react-icons/ci";
import './assigned-people.scss';

export default function AssignedPeople({
  responsables = [],
  colaboradores = [],
  candidatesResp = [],
  candidatesCol = [],
  onChange
}) {
  const [openItem, setOpenItem] = useState(null);
  const [openAdd, setOpenAdd] = useState(null);

  /** Notifica cambios al componente padre */
  const update = (nextState) => {
    onChange?.(nextState);
  };

  /** Agregar persona */
  const handleAdd = (groupKey, person) => {
    const next = {
      responsables,
      colaboradores,
      [groupKey]: [...(groupKey === "responsables" ? responsables : colaboradores), person]
    };
    update(next);
    setOpenAdd(null);
  };

  /** Cambiar persona existente */
  const handleReplace = (groupKey, index, person) => {
    const list = groupKey === 'responsables' ? [...responsables] : [...colaboradores];
    list[index] = person;

    update({
      responsables: groupKey === 'responsables' ? list : responsables,
      colaboradores: groupKey === 'colaboradores' ? list : colaboradores
    });

    setOpenItem(null);
  };

  /** Eliminar persona */
  const handleRemove = (groupKey, index) => {
    const list = groupKey === 'responsables' ? [...responsables] : [...colaboradores];
    list.splice(index, 1);

    update({
      responsables: groupKey === 'responsables' ? list : responsables,
      colaboradores: groupKey === 'colaboradores' ? list : colaboradores
    });

    if (openItem === `${groupKey}-${index}`) {
      setOpenItem(null);
    }
  };

  const Group = ({ title, groupKey, items, candidates }) => (
    <div className="peopleGroup">
      <div className="pgHead">
        <span>{title}</span>

        {/* Botón + */}
        <CiCirclePlus
          size={26}
          style={{ cursor: 'pointer' }}
          onClick={() => setOpenAdd(openAdd === groupKey ? null : groupKey)}
        />

        {/* Dropdown agregar */}
        {openAdd === groupKey && (
          <div className="dropdown global">
            {candidates.length ? (
              candidates.map(c => (
                <div key={c.id} className="dd-item" onClick={() => handleAdd(groupKey, c)}>
                  {[c.nombre, c.apellido].filter(Boolean).join(' ') || c.name}
                </div>
              ))
            ) : (
              <div className="empty">No hay opciones</div>
            )}
          </div>
        )}
      </div>

      {/* Lista de personas */}
      <div className="peopleList">
        {items.length ? items.map((p, i) => {
          const fullName = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.name || '—';
          const isOpen = openItem === `${groupKey}-${i}`;

          return (
            <div className="person" key={p.id || p.feder_id || i}>
              <Avatar src={p.avatar_url} name={fullName} size={36} />

              <div className="info">
                <div className="name">
                  {fullName}
                  <span
                    className="arrow"
                    onClick={() => setOpenItem(isOpen ? null : `${groupKey}-${i}`)}
                  >
                    <MdKeyboardArrowDown />
                  </span>
                </div>
              </div>

              {/* Eliminar persona */}
              <MdClose
                size={20}
                className="removeBtn"
                onClick={() => handleRemove(groupKey, i)}
              />

              {/* Dropdown cambiar */}
              {isOpen && (
                <div className="dropdown">
                  {candidates.length ? candidates.map(c => (
                    <div
                      className="dd-item"
                      key={c.id}
                      onClick={() => handleReplace(groupKey, i, c)}
                    >
                      {[c.nombre, c.apellido].filter(Boolean).join(' ') || c.name}
                    </div>
                  )) : (
                    <div className="empty">No hay opciones</div>
                  )}
                </div>
              )}
            </div>
          )
        }) : <div className="empty">Sin {title.toLowerCase()}</div>}
      </div>
    </div>
  );

  return (
    <div className="peopleGrid">
      <Group
        title="Colaboradores"
        groupKey="colaboradores"
        items={colaboradores}
        candidates={candidatesCol}
      />

      <Group
        title="Responsables"
        groupKey="responsables"
        items={responsables}
        candidates={candidatesResp}
      />
    </div>
  );
}
