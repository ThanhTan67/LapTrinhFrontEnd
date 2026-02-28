
import React from 'react';


function NotificationsTab() {

    return (
        <div className="d-flex flex-column h-100">
            <div className="tab-header d-flex align-items-center border-bottom">
                <ul className="d-flex justify-content-between align-items-center list-unstyled w-100 mx-4 mb-0">
                    <li>
                        <h3 className="mb-0">
                            Notifications
                        </h3>
                    </li>
                    <li>
                        <ul className="list-inline">
                            <li className="list-inline-item">
                                <button
                                    className="navigation-toggle btn btn-secondary btn-icon d-xl-none"
                                    type="button"
                                >
                                    <i className="ri-menu-line"/>
                                </button>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
            <div className="m-4">
                <div className="input-group">
                    <input
                        aria-describedby="search-notification-button"
                        aria-label="Search notifications"
                        className="form-control form-control-lg form-control-solid"
                        placeholder="Search notification"
                        type="text"
                    />
                    <button
                        className="btn btn-secondary btn-lg"
                        id="search-notification-button"
                        type="button"
                    >
                        <i className="ri-search-line"/>
                    </button>
                </div>
            </div>
            <div className="hide-scrollbar h-100">
                <div className="m-4 mt-0">
                    <div className="notification-list">
                        <div className="d-flex align-items-center mx-4 mb-3">
                            <small className="text-muted me-auto">
                                Today
                            </small>
                            <a
                                className="text-muted small"
                                href="#"
                            >
                                Clear all
                            </a>
                        </div>
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar me-4">
                          <span className="avatar-label bg-soft-success text-success">
                            KC
                          </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center overflow-hidden">
                                            <h5 className="me-auto text-break mb-0">
                                                Katherine Cassidy
                                            </h5>
                                            <span className="small text-muted text-nowrap ms-2">
                              04:45 PM
                            </span>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="line-clamp me-auto">
                                                Sent you a friend invitation.
                                            </div>
                                            <div className="dropdown ms-5">
                                                <button
                                                    aria-expanded="false"
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill"/>
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            See less often
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            Hide
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer">
                                <div className="row gx-4">
                                    <div className="col">
                                        <a
                                            className="btn btn-secondary btn-sm w-100"
                                            href="#"
                                        >
                                            Decline
                                        </a>
                                    </div>
                                    <div className="col">
                                        <a
                                            className="btn btn-primary btn-sm w-100"
                                            href="#"
                                        >
                                            Accept
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="notification-list">
                        <div className="d-flex align-items-center mx-4 mb-3">
                            <small className="text-muted me-auto">
                                Yesterday
                            </small>
                            <a
                                className="text-muted small"
                                href="#"
                            >
                                Clear all
                            </a>
                        </div>
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar me-4">
                          <span className="avatar-label bg-info text-white">
                            DR
                          </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div
                                            className="d-flex align-items-center overflow-hidden mb-1">
                                            <h5 className="mb-0 text-break me-auto">
                                                Deborah Redd
                                            </h5>
                                            <p className="small text-muted text-nowrap ms-2 mb-0">
                                                6:25 PM
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="line-clamp me-auto">
                                                Uploaded new photos.
                                            </div>
                                            <div className="dropdown ms-5">
                                                <button
                                                    aria-expanded="false"
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill"/>
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            See less often
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            Hide
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar me-4">
                          <span className="avatar-label bg-danger text-white">
                            JS
                          </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div
                                            className="d-flex align-items-center overflow-hidden mb-1">
                                            <h5 className="mb-0 text-break me-auto">
                                                Joe Stoner
                                            </h5>
                                            <p className="small text-muted text-nowrap ms-2 mb-0">
                                                5:15 PM
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="line-clamp me-auto">
                                                Updated profile picture.
                                            </div>
                                            <div className="dropdown ms-5">
                                                <button
                                                    aria-expanded="false"
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill"/>
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            See less often
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            Hide
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar me-4">
                          <span className="avatar-label bg-success text-white">
                            DG
                          </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div
                                            className="d-flex align-items-center overflow-hidden mb-1">
                                            <h5 className="mb-0 text-break me-auto">
                                                Donald Graves
                                            </h5>
                                            <p className="small text-muted text-nowrap ms-2 mb-0">
                                                4:35 PM
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="line-clamp me-auto">
                                                Sent you a private message.
                                            </div>
                                            <div className="dropdown ms-5">
                                                <button
                                                    aria-expanded="false"
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill"/>
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            See less often
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            Hide
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar me-4">
                          <span className="avatar-label bg-warning text-white fs-3">
                            <i className="ri-star-line"/>
                          </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div
                                            className="d-flex align-items-center overflow-hidden mb-1">
                                            <h5 className="mb-0 text-break me-auto">
                                                Gift
                                            </h5>
                                            <p className="small text-muted text-nowrap ms-2 mb-0">
                                                2:35 PM
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="line-clamp me-auto">
                                                You got 5GB of free storage space.
                                            </div>
                                            <div className="dropdown ms-5">
                                                <button
                                                    aria-expanded="false"
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill"/>
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            See less often
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            Hide
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar me-4">
                          <span className="avatar-label fs-3">
                            <i className="ri-settings-4-line"/>
                          </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div
                                            className="d-flex align-items-center overflow-hidden mb-1">
                                            <h5 className="mb-0 text-break me-auto">
                                                System
                                            </h5>
                                            <p className="small text-muted text-nowrap ms-2 mb-0">
                                                2:10 PM
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="line-clamp me-auto">
                                                Please setup notification settings.
                                            </div>
                                            <div className="dropdown ms-5">
                                                <button
                                                    aria-expanded="false"
                                                    className="btn btn-icon btn-base btn-sm"
                                                    data-bs-toggle="dropdown"
                                                    type="button"
                                                >
                                                    <i className="ri-more-fill"/>
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            See less often
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a
                                                            className="dropdown-item"
                                                            href="#"
                                                        >
                                                            Hide
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotificationsTab;