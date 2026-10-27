"""Client for the NetNest Design Fundamentals API (https://api.netnestdesign.com/docs).

Company fundamentals and SEC filing events, with the source filing on every number.
Data from SEC filings. Not investment advice.
"""

from .client import DEFAULT_BASE_URL, NetNestClient, __version__
from .errors import NetNestError, PaymentRequiredError, RateLimitError

__all__ = [
    "DEFAULT_BASE_URL",
    "NetNestClient",
    "NetNestError",
    "PaymentRequiredError",
    "RateLimitError",
    "__version__",
]
